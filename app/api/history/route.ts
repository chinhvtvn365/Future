import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const revalidate = 0

const SPOT_BASE = "https://api.binance.com"
const FUT_BASE = "https://fapi.binance.com"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbol = (searchParams.get("symbol") || "BTCUSDT").toUpperCase()
  const market = (searchParams.get("market") || "spot") as "spot" | "futures"
  const interval = searchParams.get("interval") || "1m"
  const limit = Math.min(Number(searchParams.get("limit") || 500), 1000)

  if (!/^[A-Z0-9]{5,20}$/.test(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 })
  }

  const base = market === "spot" ? SPOT_BASE : FUT_BASE
  const path =
    market === "spot" ? "/api/v3/klines" : "/fapi/v1/klines"

  const url = `${base}${path}?symbol=${symbol}&interval=${interval}&limit=${limit}`

  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) return NextResponse.json({ error: "Upstream error" }, { status: 502 })

  const klines = (await res.json()) as any[]

  // Binance kline: [ openTime, open, high, low, close, volume, closeTime, ... ]
  const bars = klines.map((k) => ({
    time: Number(k[0]), // ms
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }))

  return NextResponse.json({ symbol, market, interval, bars })
}
