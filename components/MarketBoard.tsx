"use client"

import { useEffect, useMemo, useRef, useState } from "react"

type TickerEvent = {
  type: "spot" | "futures"
  symbol: string
  bid: number
  ask: number
  mid: number
  ts: number
}

const POPULAR = [
  "BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","AVAXUSDT","DOTUSDT","LINKUSDT",
]

export default function MarketBoard() {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string[]>(["BTCUSDT", "ETHUSDT", "BNBUSDT"])
  const [spot, setSpot] = useState<Record<string, TickerEvent>>({})
  const [futures, setFutures] = useState<Record<string, TickerEvent>>({})

  const esRef = useRef<EventSource | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase()
    if (!q) return POPULAR
    return POPULAR.filter((s) => s.includes(q))
  }, [query])

  const toggle = (sym: string) => {
    setSelected((prev) => {
      if (prev.includes(sym)) return prev.filter((x) => x !== sym)
      if (prev.length >= 3) return prev // max 3
      return [...prev, sym]
    })
  }

  useEffect(() => {
    // close old connection
    esRef.current?.close()

    const url = `/api/stream?symbols=${encodeURIComponent(selected.join(","))}`
    const es = new EventSource(url)
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)

        // ignore hello
        if (data?.type === "hello") return

        const ev = data as TickerEvent
        if (!ev?.symbol || !ev?.type) return

        if (ev.type === "spot") {
          setSpot((prev) => ({ ...prev, [ev.symbol]: ev }))
        } else {
          setFutures((prev) => ({ ...prev, [ev.symbol]: ev }))
        }
      } catch {}
    }

    es.onerror = () => {
      // browser will auto-retry; you can show "reconnecting..." if needed
    }

    return () => {
      es.close()
    }
  }, [selected.join(",")])

  const rows = selected.map((s) => ({
    symbol: s,
    spot: spot[s],
    futures: futures[s],
  }))

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Binance Spot & Futures (Realtime)</h1>

        <div className="w-full sm:w-80">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbol (vd: BTC, ETH...)"
            className="w-full rounded-xl border px-3 py-2 outline-none focus:ring"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {filtered.slice(0, 10).map((sym) => {
              const active = selected.includes(sym)
              return (
                <button
                  key={sym}
                  onClick={() => toggle(sym)}
                  className={[
                    "rounded-full border px-3 py-1 text-sm",
                    active ? "bg-black text-white" : "bg-white",
                  ].join(" ")}
                  title={selected.length >= 3 && !active ? "Max 3 symbols" : ""}
                >
                  {sym}
                </button>
              )
            })}
          </div>
          <div className="mt-2 text-xs opacity-60">Selected (max 3): {selected.join(", ")}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <MarketTable title="Spot" rows={rows} kind="spot" />
        <MarketTable title="Futures (USDT-M)" rows={rows} kind="futures" />
      </div>
    </div>
  )
}

function MarketTable({
  title,
  rows,
  kind,
}: {
  title: string
  kind: "spot" | "futures"
  rows: { symbol: string; spot?: any; futures?: any }[]
}) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="mb-3 text-lg font-semibold">{title}</div>

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-black/5">
            <tr>
              <th className="px-3 py-2 text-left">Symbol</th>
              <th className="px-3 py-2 text-right">Bid</th>
              <th className="px-3 py-2 text-right">Ask</th>
              <th className="px-3 py-2 text-right">Mid</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ symbol, spot, futures }) => {
              const ev = kind === "spot" ? spot : futures
              return (
                <tr key={symbol} className="border-t">
                  <td className="px-3 py-2 font-medium">{symbol}</td>
                  <td className="px-3 py-2 text-right">{ev ? ev.bid.toFixed(2) : "—"}</td>
                  <td className="px-3 py-2 text-right">{ev ? ev.ask.toFixed(2) : "—"}</td>
                  <td className="px-3 py-2 text-right">{ev ? ev.mid.toFixed(2) : "—"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-xs opacity-60">
        Dữ liệu dùng bookTicker (bid/ask), mid = (bid+ask)/2
      </div>
    </div>
  )
}
