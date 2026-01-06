import { NextResponse } from "next/server"

export const revalidate = 1 // cache 1s (ISR cho route handler)

const SPOT_BASE = "https://api.binance.com"
const FUTURES_BASE = "https://fapi.binance.com"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbol = (searchParams.get("symbol") || "BTCUSDT").toUpperCase()

  // basic input validation
  if (!/^[A-Z0-9]{5,20}$/.test(symbol)) {
    return NextResponse.json({ error: "Invalid symbol" }, { status: 400 })
  }

  try {
    const [spotRes, futRes] = await Promise.all([
      fetch(`${SPOT_BASE}/api/v3/ticker/price?symbol=${symbol}`, {
        // Next cache hint
        next: { revalidate: 1 },
      }),
      fetch(`${FUTURES_BASE}/fapi/v1/ticker/price?symbol=${symbol}`, {
        next: { revalidate: 1 },
      }),
    ])

    if (!spotRes.ok || !futRes.ok) {
      return NextResponse.json(
        { error: "Binance upstream error", spotOk: spotRes.ok, futuresOk: futRes.ok },
        { status: 502 }
      )
    }

    const spot = (await spotRes.json()) as { symbol: string; price: string }
    const futures = (await futRes.json()) as { symbol: string; price: string }

    return NextResponse.json({
      symbol,
      spotPrice: Number(spot.price),
      futuresPrice: Number(futures.price),
      ts: Date.now(),
    })
  } catch (e) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
