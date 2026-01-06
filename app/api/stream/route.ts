import { binanceHub } from "@/lib/binance-hub"
import { headers } from "next/headers"

export const runtime = "nodejs"

const API_KEY = process.env.STREAM_API_KEY || "" // nếu muốn auth
const ALLOW_IPS = (process.env.ALLOW_IPS || "").split(",").map(s => s.trim()).filter(Boolean)

// rate limit đơn giản: ip -> timestamps
const rate = new Map<string, number[]>()
function rateLimit(ip: string, limit = 60, windowMs = 60_000) {
  const now = Date.now()
  const arr = rate.get(ip) || []
  const keep = arr.filter((t) => now - t < windowMs)
  keep.push(now)
  rate.set(ip, keep)
  return keep.length <= limit
}

export async function GET(req: Request) {
  const h = await headers()
  const ip = (h.get("x-forwarded-for") || "unknown").split(",")[0].trim()

  // whitelist IP (optional)
  if (ALLOW_IPS.length && !ALLOW_IPS.includes(ip)) {
    return new Response("Forbidden", { status: 403 })
  }

  // auth (optional)
  if (API_KEY) {
    const key = req.headers.get("x-api-key") || ""
    if (key !== API_KEY) return new Response("Unauthorized", { status: 401 })
  }

  // rate limit (optional)
  if (!rateLimit(ip, 120, 60_000)) {
    return new Response("Too Many Requests", { status: 429 })
  }

  const { searchParams } = new URL(req.url)
  const symbolsParam = searchParams.get("symbols") || "BTCUSDT,ETHUSDT,BNBUSDT"
  const symbols = symbolsParam.split(",").map(s => s.trim()).filter(Boolean).slice(0, 3)

  const clientId = crypto.randomUUID()

  binanceHub.start()
  binanceHub.subscribe(clientId, symbols)

  // log basic
  console.log("[stream] connect", { ip, clientId, symbols })

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      const send = (obj: any) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`))

      send({ type: "hello", symbols })

      const off = binanceHub.onTick((ev) => send(ev))
      const ping = setInterval(() => controller.enqueue(encoder.encode(`: ping\n\n`)), 15000)

      // cleanup
      // @ts-ignore
      req.signal?.addEventListener("abort", () => {
        clearInterval(ping)
        off()
        binanceHub.unsubscribe(clientId)
        console.log("[stream] disconnect", { ip, clientId })
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
