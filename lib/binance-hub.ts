import EventEmitter from "events"
import WebSocket from "ws"

export type MarketType = "spot" | "futures"
export type Tick = {
  type: MarketType
  symbol: string
  bid: number
  ask: number
  mid: number
  spread: number
  spreadPct: number
  ts: number
}

type ClientId = string

class BinanceHub {
  private emitter = new EventEmitter()
  private spotWS?: WebSocket
  private futuresWS?: WebSocket

  // client -> symbols
  private clientSymbols = new Map<ClientId, Set<string>>()
  private unionSymbols = new Set<string>()

  // last prices for basis calc
  private lastSpotMid = new Map<string, number>()
  private lastFutMid = new Map<string, number>()

  private started = false
  private reconnectTimer?: NodeJS.Timeout

  start() {
    if (this.started) return
    this.started = true
    this.reconnect()
  }

  subscribe(clientId: ClientId, symbols: string[]) {
    const clean = symbols
      .map((s) => s.trim().toUpperCase())
      .filter((s) => /^[A-Z0-9]{5,20}$/.test(s))
      .slice(0, 3)

    this.clientSymbols.set(clientId, new Set(clean))
    this.recomputeUnionAndReconnect()
  }

  unsubscribe(clientId: ClientId) {
    this.clientSymbols.delete(clientId)
    this.recomputeUnionAndReconnect()
  }

  onTick(fn: (tick: Tick & { basisPct?: number }) => void) {
    this.emitter.on("tick", fn)
    return () => this.emitter.off("tick", fn)
  }

  private recomputeUnionAndReconnect() {
    const next = new Set<string>()
    for (const set of this.clientSymbols.values()) {
      for (const s of set) next.add(s)
    }

    const changed =
      next.size !== this.unionSymbols.size ||
      [...next].some((s) => !this.unionSymbols.has(s))

    this.unionSymbols = next

    if (!this.started) return
    if (!changed) return

    // debounce reconnect
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => this.reconnect(), 150)
  }

  private reconnect() {
    this.close()

    const symbols = [...this.unionSymbols]
    if (!symbols.length) return

    const spotStreams = symbols.map((s) => `${s.toLowerCase()}@bookTicker`)
    const futStreams = symbols.map((s) => `${s.toLowerCase()}@bookTicker`)

    const spotUrl = `wss://stream.binance.com:9443/stream?streams=${spotStreams.join("/")}`
    const futUrl = `wss://fstream.binance.com/stream?streams=${futStreams.join("/")}`

    this.spotWS = this.connectWS(spotUrl, "spot")
    this.futuresWS = this.connectWS(futUrl, "futures")
  }

  private connectWS(url: string, type: MarketType) {
    const ws = new WebSocket(url)

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString())
        const d = msg?.data
        if (!d?.s || d?.b == null || d?.a == null) return

        const symbol = String(d.s)
        const bid = Number(d.b)
        const ask = Number(d.a)
        if (!Number.isFinite(bid) || !Number.isFinite(ask)) return

        const mid = (bid + ask) / 2
        const spread = ask - bid
        const spreadPct = mid ? (spread / mid) * 100 : 0

        // store last mid for basis%
        if (type === "spot") this.lastSpotMid.set(symbol, mid)
        else this.lastFutMid.set(symbol, mid)

        const spotMid = this.lastSpotMid.get(symbol)
        const futMid = this.lastFutMid.get(symbol)
        const basisPct =
          spotMid && futMid ? ((futMid - spotMid) / spotMid) * 100 : undefined

        this.emitter.emit("tick", {
          type,
          symbol,
          bid,
          ask,
          mid,
          spread,
          spreadPct,
          basisPct,
          ts: Date.now(),
        })
      } catch {}
    })

    ws.on("close", () => {
      // auto reconnect
      setTimeout(() => this.started && this.reconnect(), 1000)
    })

    ws.on("error", () => {
      // let close handler reconnect
    })

    return ws
  }

  private close() {
    try { this.spotWS?.close() } catch {}
    try { this.futuresWS?.close() } catch {}
    this.spotWS = undefined
    this.futuresWS = undefined
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __binanceHub: BinanceHub | undefined
}

export const binanceHub = global.__binanceHub ?? new BinanceHub()
if (!global.__binanceHub) global.__binanceHub = binanceHub
