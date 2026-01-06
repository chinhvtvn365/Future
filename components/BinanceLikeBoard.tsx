"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TwoCharts from "@/components/TwoCharts";

type Tick = {
  type: "spot" | "futures";
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  spread: number;
  spreadPct: number;
  basisPct?: number;
  ts: number;
};

type Row = {
  symbol: string;
  spot?: Tick;
  futures?: Tick;
  basisPct?: number;
};

const LS_WATCH = "watchlist_v1";

export default function BinanceLikeBoard() {
  const [tab, setTab] = useState<"spot" | "futures">("spot");
  const [symbolsAll, setSymbolsAll] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([
    "BTCUSDT",
    "ETHUSDT",
    "BNBUSDT",
  ]);
  const [watch, setWatch] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<"mid" | "spreadPct" | "basisPct">(
    "mid"
  );
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [focus, setFocus] = useState<string>("BTCUSDT");

  const [spot, setSpot] = useState<Record<string, Tick>>({});
  const [futures, setFutures] = useState<Record<string, Tick>>({});

  // chart points (mid)
  const [chart, setChart] = useState<{ time: number; value: number }[]>([]);
  const [linePoints, setLinePoints] = useState<
    { time: number; value: number }[]
  >([]);
  const [candleBars, setCandleBars] = useState<
    { time: number; open: number; high: number; low: number; close: number }[]
  >([]);

  const lastSecRef = useRef<number | null>(null);

  const prevMidRef = useRef<Record<string, number>>({});

  // load watchlist
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_WATCH);
      if (raw) setWatch(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(LS_WATCH, JSON.stringify(watch));
  }, [watch]);

  // load symbols from Binance exchangeInfo
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/symbols", { cache: "force-cache" });
      if (!res.ok) return;
      const json = await res.json();
      setSymbolsAll(json.both || []);
    })();
  }, []);

  // SSE subscribe
  useEffect(() => {
    const url = `/api/stream?symbols=${encodeURIComponent(selected.join(","))}`;
    const es = new EventSource(url);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data?.type === "hello") return;

        const ev = data as Tick;
        if (!ev?.symbol) return;

        const key = `${ev.type}:${ev.symbol}`;
        const prevMid = prevMidRef.current[key];
        prevMidRef.current[key] = ev.mid;

        if (ev.type === "spot") setSpot((p) => ({ ...p, [ev.symbol]: ev }));
        else setFutures((p) => ({ ...p, [ev.symbol]: ev }));

        // push chart for focus symbol only (the current tab market)
        if (ev.symbol === focus && ev.type === tab) {
          const sec = Math.floor(ev.ts / 1000);
          setLinePoints((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && Math.floor(last.time / 1000) === sec) {
              // update same second
              next[next.length - 1] = { time: ev.ts, value: ev.mid };
            } else {
              next.push({ time: ev.ts, value: ev.mid });
              if (next.length > 600) next.splice(0, next.length - 600);
            }
            return next;
          });
          setCandleBars((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && Math.floor(last.time / 1000) === sec) {
              // update current candle
              next[next.length - 1] = {
                ...last,
                time: ev.ts,
                high: Math.max(last.high, ev.mid),
                low: Math.min(last.low, ev.mid),
                close: ev.mid,
              };
            } else {
              // new candle
              next.push({
                time: ev.ts,
                open: ev.mid,
                high: ev.mid,
                low: ev.mid,
                close: ev.mid,
              });
              if (next.length > 600) next.splice(0, next.length - 600);
            }
            return next;
          });
        }
      } catch {}
    };

    return () => es.close();
  }, [selected.join(","), focus, tab]);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    const src = symbolsAll.length ? symbolsAll : selected;
    if (!q) return src.slice(0, 30);
    return src.filter((s) => s.includes(q)).slice(0, 30);
  }, [query, symbolsAll, selected]);

  const toggleSelect = (sym: string) => {
    setSelected((prev) => {
      const has = prev.includes(sym);
      if (has) return prev.filter((x) => x !== sym);
      if (prev.length >= 3) return prev;
      return [...prev, sym];
    });
    setFocus(sym);
    setChart([]);
  };

  const toggleWatch = (sym: string) => {
    setWatch((prev) =>
      prev.includes(sym) ? prev.filter((x) => x !== sym) : [...prev, sym]
    );
  };

  const rows: Row[] = useMemo(() => {
    const base = selected.map((s) => ({
      symbol: s,
      spot: spot[s],
      futures: futures[s],
      basisPct: futures[s]?.basisPct, // server đã tính
    }));

    const getVal = (r: Row) => {
      const ev = tab === "spot" ? r.spot : r.futures;
      if (sortKey === "mid") return ev?.mid ?? -Infinity;
      if (sortKey === "spreadPct") return ev?.spreadPct ?? -Infinity;
      return r.basisPct ?? -Infinity;
    };

    base.sort((a, b) => {
      const d = getVal(a) - getVal(b);
      return sortDir === "asc" ? d : -d;
    });

    return base;
  }, [selected, spot, futures, tab, sortKey, sortDir]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Left */}
        <div className="flex-1 space-y-4">
          <div className="rounded-2xl border bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xl font-semibold">
                  Market (Spot & Futures)
                </div>
                <div className="text-xs text-gray-500">
                  Chọn tối đa 3 cặp • Realtime • Server WS → Client SSE
                </div>
              </div>

              <div className="flex gap-2">
                <TabButton
                  active={tab === "spot"}
                  onClick={() => {
                    setTab("spot");
                    setChart([]);
                  }}
                >
                  Spot
                </TabButton>
                <TabButton
                  active={tab === "futures"}
                  onClick={() => {
                    setTab("futures");
                    setChart([]);
                  }}
                >
                  Futures
                </TabButton>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search symbol (BTCUSDT...)"
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {filtered.map((sym) => {
                    const active = selected.includes(sym);
                    return (
                      <button
                        key={sym}
                        onClick={() => toggleSelect(sym)}
                        className={[
                          "rounded-full border px-3 py-1 text-xs transition",
                          active
                            ? "bg-black text-white"
                            : "bg-white hover:bg-gray-50",
                        ].join(" ")}
                        title={
                          selected.length >= 3 && !active ? "Max 3 symbols" : ""
                        }
                      >
                        {sym}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Selected:{" "}
                  <span className="font-medium text-gray-900">
                    {selected.join(", ")}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-gray-500">Sort:</span>
                  <SelectPill
                    active={sortKey === "mid"}
                    onClick={() => setSortKey("mid")}
                  >
                    Mid
                  </SelectPill>
                  <SelectPill
                    active={sortKey === "spreadPct"}
                    onClick={() => setSortKey("spreadPct")}
                  >
                    Spread%
                  </SelectPill>
                  <SelectPill
                    active={sortKey === "basisPct"}
                    onClick={() => setSortKey("basisPct")}
                  >
                    Basis%
                  </SelectPill>

                  <SelectPill
                    active={sortDir === "desc"}
                    onClick={() => setSortDir("desc")}
                  >
                    Desc
                  </SelectPill>
                  <SelectPill
                    active={sortDir === "asc"}
                    onClick={() => setSortDir("asc")}
                  >
                    Asc
                  </SelectPill>
                </div>

                <div className="text-xs text-gray-500">
                  Basis% = (FuturesMid - SpotMid) / SpotMid
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">Watchlist</div>
                    <div className="text-xs text-gray-500">
                      lưu localStorage
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {watch.length ? (
                      watch.map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setFocus(s);
                            setChart([]);
                          }}
                          className="rounded-full border bg-white px-3 py-1 text-xs hover:bg-gray-50"
                        >
                          {s}
                        </button>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">Chưa có</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold">
                {tab === "spot" ? "Spot" : "Futures"} Tickers
              </div>
              <div className="text-xs text-gray-500">
                Click symbol để xem chart
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Symbol</th>
                    <th className="px-3 py-2 text-right">Bid</th>
                    <th className="px-3 py-2 text-right">Ask</th>
                    <th className="px-3 py-2 text-right">Mid</th>
                    <th className="px-3 py-2 text-right">Spread%</th>
                    <th className="px-3 py-2 text-right">Basis%</th>
                    <th className="px-3 py-2 text-right">★</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const ev = tab === "spot" ? r.spot : r.futures;
                    const mid = ev?.mid;
                    const key = `${tab}:${r.symbol}`;
                    const prev = prevMidRef.current[key];
                    const up = prev != null && mid != null ? mid > prev : false;
                    const down =
                      prev != null && mid != null ? mid < prev : false;

                    return (
                      <tr key={r.symbol} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <button
                            onClick={() => {
                              setFocus(r.symbol);
                              setChart([]);
                            }}
                            className="font-semibold hover:underline"
                          >
                            {r.symbol}
                          </button>
                        </td>

                        <td className="px-3 py-2 text-right">
                          {ev ? ev.bid.toFixed(2) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {ev ? ev.ask.toFixed(2) : "—"}
                        </td>

                        <td
                          className={[
                            "px-3 py-2 text-right font-semibold transition",
                            up ? "bg-green-50" : down ? "bg-red-50" : "",
                          ].join(" ")}
                        >
                          {ev ? ev.mid.toFixed(2) : "—"}
                        </td>

                        <td className="px-3 py-2 text-right">
                          {ev ? ev.spreadPct.toFixed(4) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {r.basisPct != null ? r.basisPct.toFixed(4) : "—"}
                        </td>

                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => toggleWatch(r.symbol)}
                            className="rounded-md px-2 py-1 text-xs hover:bg-gray-100"
                            title="Add/Remove watchlist"
                          >
                            {watch.includes(r.symbol) ? "★" : "☆"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Chart */}
        <div className="w-full lg:w-[360px] space-y-4">
          <TwoCharts
            titleLine={`${focus} • ${tab.toUpperCase()} • Line (Mid)`}
            titleCandle={`${focus} • ${tab.toUpperCase()} • Candles (1s)`}
            linePoints={linePoints}
            candleBars={candleBars}
          />

          <div className="rounded-2xl border bg-white p-4 text-xs text-gray-600 space-y-2">
            <div className="font-semibold text-gray-900">
              Gợi ý nâng cấp tiếp
            </div>
            <ul className="list-disc pl-4">
              <li>Đổi chart sang candle bằng aggTrade/kline</li>
              <li>Thêm %change 24h (REST ticker/24hr) và cache 10s</li>
              <li>Thêm auth bằng cookie/JWT + RBAC</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full px-4 py-2 text-sm font-semibold transition",
        active ? "bg-black text-white" : "bg-gray-100 hover:bg-gray-200",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function SelectPill({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1 text-xs transition",
        active
          ? "bg-black text-white border-black"
          : "bg-white hover:bg-gray-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
