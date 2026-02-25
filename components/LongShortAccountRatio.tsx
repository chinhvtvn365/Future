"use client";

import { useEffect, useState } from "react";

type LongShortData = {
  symbol: string;
  longShortRatio: string;
  longAccount: string;
  shortAccount: string;
  timestamp: number;
};

type ApiResponse = {
  data: LongShortData[];
  period: string;
  timestamp: number;
};

type Props = {
  compact?: boolean;
};

export default function LongShortAccountRatio({ compact = false }: Props) {
  const [data, setData] = useState<LongShortData[]>([]);
  const [period, setPeriod] = useState<string>("5m");
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const periods = ["5m", "15m", "30m", "1h", "2h", "4h", "6h", "12h", "1d"];

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/long-short-ratio?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch");
      
      const json: ApiResponse = await res.json();
      setData(json.data);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error("Error fetching long/short ratio:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, [period]);

  const getLongPercentage = (ratio: string) => {
    const r = parseFloat(ratio);
    return (r / (r + 1)) * 100;
  };

  const getShortPercentage = (ratio: string) => {
    const r = parseFloat(ratio);
    return (1 / (r + 1)) * 100;
  };

  const formatSymbol = (symbol: string) => {
    return symbol.replace("USDT", "");
  };

  return (
    <div className={`bg-[#0b0e11] text-white ${compact ? 'p-4' : 'min-h-screen p-4 md:p-6'}`}>
      <div className={compact ? '' : 'max-w-7xl mx-auto'}>
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <div>
              <h1 className={`font-bold mb-1 bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent ${compact ? 'text-lg' : 'text-2xl md:text-3xl mb-2'}`}>
                Long/Short Account Ratio
              </h1>
              <p className={`text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>
                Top 10 cryptocurrencies by market cap
              </p>
            </div>
            
            {/* Period Selector */}
            <div className={`flex items-center gap-1 bg-[#1e2329] rounded-lg p-1 ${compact ? 'flex-wrap' : ''}`}>
              {periods.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`${compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} rounded-md font-medium transition-all ${
                    period === p
                      ? "bg-[#fcd535] text-black"
                      : "text-gray-400 hover:text-white hover:bg-[#2b3139]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Last Update */}
          {lastUpdate && (
            <div className="text-xs text-gray-500">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
          </div>
        )}

        {/* Data Grid */}
        {!loading && (
          <div className={`grid grid-cols-1 md:grid-cols-2 ${compact ? 'lg:grid-cols-3 xl:grid-cols-5 gap-3' : 'lg:grid-cols-2 xl:grid-cols-2 gap-4'}`}>
            {data.map((item) => {
              const ratio = parseFloat(item.longShortRatio);
              const longPct = getLongPercentage(item.longShortRatio);
              const shortPct = getShortPercentage(item.longShortRatio);
              const isLongDominant = ratio > 1;

              return (
                <div
                  key={item.symbol}
                  className={`bg-[#1e2329] rounded-lg border border-[#2b3139] hover:border-[#474d57] transition-all hover:shadow-lg hover:shadow-yellow-500/10 ${compact ? 'p-3' : 'p-5'}`}
                >
                  {/* Symbol Header */}
                  <div className={`flex items-center justify-between ${compact ? 'mb-2' : 'mb-4'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center font-bold text-black ${compact ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'}`}>
                        {formatSymbol(item.symbol).charAt(0)}
                      </div>
                      <div>
                        <h3 className={`font-bold ${compact ? 'text-sm' : 'text-lg'}`}>{formatSymbol(item.symbol)}</h3>
                        {!compact && <p className="text-xs text-gray-500">USDT</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}>Ratio</div>
                      <div className={`font-bold ${isLongDominant ? 'text-green-400' : 'text-red-400'} ${compact ? 'text-base' : 'text-xl'}`}>
                        {ratio.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className={compact ? 'mb-2' : 'mb-3'}>
                    <div className={`flex rounded-full overflow-hidden bg-[#0b0e11] ${compact ? 'h-2' : 'h-3'}`}>
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                        style={{ width: `${longPct}%` }}
                      />
                      <div
                        className="bg-gradient-to-r from-red-400 to-red-500 transition-all duration-500"
                        style={{ width: `${shortPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Long/Short Percentages */}
                  <div className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-3'}`}>
                    <div className={`bg-[#0b0e11] rounded-lg ${compact ? 'p-2' : 'p-3'}`}>
                      <div className="flex items-center gap-1 mb-1">
                        <div className={`rounded-full bg-green-400 ${compact ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}></div>
                        <span className={`text-gray-400 uppercase ${compact ? 'text-[10px]' : 'text-xs'}`}>Long</span>
                      </div>
                      <div className={`font-bold text-green-400 ${compact ? 'text-sm' : 'text-lg'}`}>
                        {longPct.toFixed(2)}%
                      </div>
                      {!compact && (
                        <div className="text-xs text-gray-500 mt-1">
                          {(parseFloat(item.longAccount) * 100).toFixed(2)}% accounts
                        </div>
                      )}
                    </div>
                    <div className={`bg-[#0b0e11] rounded-lg ${compact ? 'p-2' : 'p-3'}`}>
                      <div className="flex items-center gap-1 mb-1">
                        <div className={`rounded-full bg-red-400 ${compact ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}></div>
                        <span className={`text-gray-400 uppercase ${compact ? 'text-[10px]' : 'text-xs'}`}>Short</span>
                      </div>
                      <div className={`font-bold text-red-400 ${compact ? 'text-sm' : 'text-lg'}`}>
                        {shortPct.toFixed(2)}%
                      </div>
                      {!compact && (
                        <div className="text-xs text-gray-500 mt-1">
                          {(parseFloat(item.shortAccount) * 100).toFixed(2)}% accounts
                        </div>
                      )}
                  {!compact && (
                    <div className="mt-3 pt-3 border-t border-[#2b3139]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Market Sentiment</span>
                        <span className={`font-bold ${
                          ratio > 1.5 ? 'text-green-400' : 
                          ratio < 0.67 ? 'text-red-400' : 
                          'text-yellow-400'
                        }`}>
                          {ratio > 1.5 ? '🚀 Very Bullish' : 
                           ratio > 1 ? '📈 Bullish' : 
                           ratio > 0.67 ? '📊 Neutral' : 
                           ratio > 0.5 ? '📉 Bearish' : 
                           '💀 Very Bearish'}
                        </span>
                      </div>
                    </div>
                  )} ratio > 0.5 ? '📉 Bearish' : 
                         '💀 Very Bearish'}
                      </span>
                    </div>
                  </div>
                </div>
        {!compact && (
          <div className="mt-8 bg-[#1e2329] rounded-lg p-4 border border-[#2b3139]">
            <h3 className="text-sm font-bold mb-2 text-yellow-400">📊 About Long/Short Ratio</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              The Long/Short Account Ratio shows the proportion of accounts with net long positions versus 
              net short positions. A ratio above 1 indicates more accounts are bullish (long), while below 1 
              indicates more accounts are bearish (short). This data is from Binance Futures and updates 
              every {period}.
            </p>
          </div>
        )}lassName="text-xs text-gray-400 leading-relaxed">
            The Long/Short Account Ratio shows the proportion of accounts with net long positions versus 
            net short positions. A ratio above 1 indicates more accounts are bullish (long), while below 1 
            indicates more accounts are bearish (short). This data is from Binance Futures and updates 
            every {period}.
          </p>
        </div>
      </div>
    </div>
  );
}
