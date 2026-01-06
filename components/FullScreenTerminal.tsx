"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import TwoChartsPro from "@/components/TwoChartsPro"

type Market = "spot" | "futures"
type Tick = {
  type: Market
  symbol: string
  bid: number
  ask: number
  mid: number
  spread: number
  spreadPct: number
  basisPct?: number
  ts: number
}

type Bar = { time: number; open: number; high: number; low: number; close: number }

export default function FullScreenTerminal() {
  const [tab, setTab] = useState<Market>("spot")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string[]>(["BTCUSDT", "ETHUSDT", "BNBUSDT"])
  const [focus, setFocus] = useState<string>("BTCUSDT")

  const [spotTicks, setSpotTicks] = useState<Record<string, Tick>>({})
  const [futTicks, setFutTicks] = useState<Record<string, Tick>>({})

  // chart states
  const [lineHistory, setLineHistory] = useState<{ time: number; value: number }[]>([])
  const [candleHistory, setCandleHistory] = useState<Bar[]>([])

  // realtime aggregation for candle (same second)
  const lastCandleSecRef = useRef<number | null>(null)

  // SSE realtime (server->client)
  useEffect(() => {
    const url = `/api/stream?symbols=${encodeURIComponent(selected.join(","))}`
    const es = new EventSource(url)

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data?.type === "hello") return

        const ev = data as Tick
        if (!ev?.symbol) return

        if (ev.type === "spot") setSpotTicks((p) => ({ ...p, [ev.symbol]: ev }))
        else setFutTicks((p) => ({ ...p, [ev.symbol]: ev }))

        // realtime update into chart for focus+tab
        if (ev.symbol === focus && ev.type === tab) {
          const sec = Math.floor(ev.ts / 1000)

          // line point: keep 1 point/second, update last second
          setLineHistory((prev) => {
            const next = [...prev]
            const last = next[next.length - 1]
            if (last && Math.floor(last.time / 1000) === sec) {
              next[next.length - 1] = { time: ev.ts, value: ev.mid }
            } else {
              next.push({ time: ev.ts, value: ev.mid })
              if (next.length > 1200) next.splice(0, next.length - 1200)
            }
            return next
          })

          // candle: update current second candle
          setCandleHistory((prev) => {
            const next = [...prev]
            const last = next[next.length - 1]
            if (last && Math.floor(last.time / 1000) === sec) {
              next[next.length - 1] = {
                ...last,
                time: ev.ts,
                high: Math.max(last.high, ev.mid),
                low: Math.min(last.low, ev.mid),
                close: ev.mid,
              }
            } else {
              next.push({
                time: ev.ts,
                open: ev.mid,
                high: ev.mid,
                low: ev.mid,
                close: ev.mid,
              })
              if (next.length > 1200) next.splice(0, next.length - 1200)
            }
            lastCandleSecRef.current = sec
            return next
          })
        }
      } catch {}
    }

    return () => es.close()
  }, [selected.join(","), focus, tab])

  // Load history whenever focus/tab changes (giống TradingView: có dữ liệu trước đó)
  useEffect(() => {
    ;(async () => {
      lastCandleSecRef.current = null

      const res = await fetch(`/api/history?symbol=${focus}&market=${tab}&interval=1m&limit=500`, {
        cache: "no-store",
      })
      if (!res.ok) return
      const json = await res.json()
      const bars = (json.bars || []) as Bar[]

      // candle history
      setCandleHistory(bars)

      // line history from candle close
      setLineHistory(bars.map((b) => ({ time: b.time, value: b.close })))
    })()
  }, [focus, tab])

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase()
    const base = ["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","AVAXUSDT","DOTUSDT","LINKUSDT"]
    if (!q) return base
    return base.filter((s) => s.includes(q))
  }, [query])

  const toggle = (sym: string) => {
    setSelected((prev) => {
      if (prev.includes(sym)) return prev.filter((x) => x !== sym)
      if (prev.length >= 3) return prev
      return [...prev, sym]
    })
    setFocus(sym)
  }

  const focusTick = tab === "spot" ? spotTicks[focus] : futTicks[focus]

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3">
          <div className="text-base font-semibold tracking-tight">Mini Binance Terminal</div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setTab("spot")}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                tab === "spot" ? "bg-white text-zinc-900" : "bg-white/10 hover:bg-white/15"
              }`}
            >
              Spot
            </button>
            <button
              onClick={() => setTab("futures")}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                tab === "futures" ? "bg-white text-zinc-900" : "bg-white/10 hover:bg-white/15"
              }`}
            >
              Futures
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-4">
        {/* Controls */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Symbols</div>
                <div className="text-xs text-zinc-400">Chọn tối đa 3 • Realtime</div>
              </div>
              <div className="text-xs text-zinc-400">Focus: <span className="text-zinc-100">{focus}</span></div>
            </div>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search (BTC, ETH...)"
              className="mt-3 w-full rounded-xl border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20"
            />

            <div className="mt-3 flex flex-wrap gap-2">
              {filtered.map((sym) => {
                const active = selected.includes(sym)
                return (
                  <button
                    key={sym}
                    onClick={() => toggle(sym)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "border-white/30 bg-white text-zinc-900"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                    title={selected.length >= 3 && !active ? "Max 3 symbols" : ""}
                  >
                    {sym}
                  </button>
                )
              })}
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-zinc-900/40 p-3">
              <div className="text-xs text-zinc-400">Selected</div>
              <div className="mt-1 text-sm font-semibold">{selected.join(", ")}</div>
              <div className="mt-2 text-xs text-zinc-400">
                Mid: <span className="text-zinc-100 font-semibold">{focusTick ? focusTick.mid.toFixed(2) : "—"}</span>
                {"  "}• Spread%: <span className="text-zinc-100 font-semibold">{focusTick ? focusTick.spreadPct.toFixed(4) : "—"}</span>
              </div>
            </div>
          </div>

          {/* Charts: full width row, each chart half */}
          <TwoChartsPro
            titleLeft={`${focus} • ${tab.toUpperCase()} • Line (Close/Mid)`}
            titleRight={`${focus} • ${tab.toUpperCase()} • Candles (1m history + realtime)`}
            linePoints={lineHistory}
            candleBars={candleHistory}
          />
        </div>
      </div>
    </div>
  )
}
