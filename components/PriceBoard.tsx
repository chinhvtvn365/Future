"use client"

import { useEffect, useState } from "react"

type PriceResp = {
  symbol: string
  spotPrice: number
  futuresPrice: number
  ts: number
}

export default function PriceBoard({ symbol = "BTCUSDT" }: { symbol?: string }) {
  const [data, setData] = useState<PriceResp | null>(null)

  useEffect(() => {
    let alive = true

    const load = async () => {
      const res = await fetch(`/api/binance/price?symbol=${symbol}`, { cache: "no-store" })
      if (!res.ok) return
      const json = (await res.json()) as PriceResp
      if (alive) setData(json)
    }

    load()
    const t = setInterval(load, 2000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [symbol])

  return (
    <div className="rounded-2xl border p-4">
      <div className="text-lg font-semibold">{symbol}</div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-white/5 p-3">
          <div className="text-sm opacity-70">Spot</div>
          <div className="text-2xl font-bold">{data ? data.spotPrice : "—"}</div>
        </div>

        <div className="rounded-xl bg-white/5 p-3">
          <div className="text-sm opacity-70">Futures</div>
          <div className="text-2xl font-bold">{data ? data.futuresPrice : "—"}</div>
        </div>
      </div>

      <div className="mt-2 text-xs opacity-60">
        Updated: {data ? new Date(data.ts).toLocaleTimeString() : "—"}
      </div>
    </div>
  )
}
