import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const revalidate = 3600 // 1h cache

const SPOT = "https://api.binance.com/api/v3/exchangeInfo?permissions=SPOT"
const FUT  = "https://fapi.binance.com/fapi/v1/exchangeInfo"

export async function GET() {
  const [sRes, fRes] = await Promise.all([fetch(SPOT), fetch(FUT)])
  if (!sRes.ok || !fRes.ok) return NextResponse.json({ error: "upstream" }, { status: 502 })

  const spot = await sRes.json()
  const fut = await fRes.json()

  // lấy danh sách symbol dạng BTCUSDT...
  const spotSyms = (spot.symbols || []).map((x: any) => x.symbol).filter(Boolean)
  const futSyms  = (fut.symbols || []).map((x: any) => x.symbol).filter(Boolean)

  // intersection để chắc symbol có cả spot + futures
  const setF = new Set(futSyms)
  const both = spotSyms.filter((s: string) => setF.has(s))

  return NextResponse.json({
    both,
    spot: spotSyms,
    futures: futSyms,
  })
}
