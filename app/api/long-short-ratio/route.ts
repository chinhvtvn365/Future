import { NextResponse } from "next/server";

export const revalidate = 5; // cache 5s

const FUTURES_BASE = "https://fapi.binance.com";

// Top 10 cryptocurrencies by market cap (as of 2024-2026)
const TOP_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "ADAUSDT",
  "AVAXUSDT",
  "DOGEUSDT",
  "DOTUSDT",
  "MATICUSDT",
];

type LongShortRatio = {
  symbol: string;
  longShortRatio: string;
  longAccount: string;
  shortAccount: string;
  timestamp: number;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "5m"; // 5m, 15m, 30m, 1h, 2h, 4h, 6h, 12h, 1d
  const limit = searchParams.get("limit") || "1"; // Get latest data only

  try {
    // Fetch long/short ratio for all top symbols
    const promises = TOP_SYMBOLS.map(async (symbol) => {
      try {
        const url = `${FUTURES_BASE}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=${limit}`;
        const res = await fetch(url, {
          next: { revalidate: 5 },
        });

        if (!res.ok) {
          console.error(`Failed to fetch ${symbol}: ${res.status}`);
          return null;
        }

        const data = await res.json();
        
        // API returns an array, get the latest (last item)
        if (Array.isArray(data) && data.length > 0) {
          const latest = data[data.length - 1];
          return {
            symbol,
            longShortRatio: latest.longShortRatio,
            longAccount: latest.longAccount,
            shortAccount: latest.shortAccount,
            timestamp: latest.timestamp,
          };
        }
        return null;
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    const filtered = results.filter((r): r is LongShortRatio => r !== null);

    return NextResponse.json({
      data: filtered,
      period,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Long/Short Ratio API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch long/short ratio data" },
      { status: 500 }
    );
  }
}
