"use client";

import { useState } from "react";
import CoinGeckoMarquee from "./CoinGeckoMarquee";
import BinanceLikeBoard from "./BinanceLikeBoard";
import LongShortAccountRatio from "./LongShortAccountRatio";

type Tab = "trading" | "longshort" | "all";

export default function MainDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("all");

  return (
    <div className="min-h-screen bg-[#0b0e11]">
      {/* Top Marquee */}
      <div className="sticky top-0 z-50 bg-[#0b0e11] border-b border-[#2b3139]">
        <CoinGeckoMarquee />
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-[60px] z-40 bg-[#1e2329] border-b border-[#2b3139]">
        <div className="max-w-[1920px] mx-auto px-4">
          <div className="flex items-center gap-1 py-2">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === "all"
                  ? "bg-[#fcd535] text-black"
                  : "text-gray-400 hover:text-white hover:bg-[#2b3139]"
              }`}
            >
              📊 All Dashboard
            </button>
            <button
              onClick={() => setActiveTab("trading")}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === "trading"
                  ? "bg-[#fcd535] text-black"
                  : "text-gray-400 hover:text-white hover:bg-[#2b3139]"
              }`}
            >
              💹 Trading Board
            </button>
            <button
              onClick={() => setActiveTab("longshort")}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                activeTab === "longshort"
                  ? "bg-[#fcd535] text-black"
                  : "text-gray-400 hover:text-white hover:bg-[#2b3139]"
              }`}
            >
              ⚖️ Long/Short Ratio
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto">
        {/* All Dashboard View */}
        {activeTab === "all" && (
          <div className="space-y-4 p-4">
            {/* Long/Short Ratio Section - Compact */}
            <section className="bg-[#1e2329] rounded-xl border border-[#2b3139] overflow-hidden">
              <div className="bg-gradient-to-r from-[#1e2329] to-[#2b3139] px-4 py-3 border-b border-[#2b3139]">
                <h2 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                  ⚖️ Long/Short Account Ratio
                  <span className="text-xs text-gray-500 font-normal">Real-time market sentiment</span>
                </h2>
              </div>
              <LongShortAccountRatio compact={true} />
            </section>

            {/* Trading Board Section */}
            <section className="bg-[#1e2329] rounded-xl border border-[#2b3139] overflow-hidden">
              <div className="bg-gradient-to-r from-[#1e2329] to-[#2b3139] px-4 py-3 border-b border-[#2b3139]">
                <h2 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                  💹 Trading Board
                  <span className="text-xs text-gray-500 font-normal">Live spot & futures prices</span>
                </h2>
              </div>
              <div className="p-4">
                <BinanceLikeBoard />
              </div>
            </section>
          </div>
        )}

        {/* Trading Board Only */}
        {activeTab === "trading" && (
          <div className="p-4">
            <BinanceLikeBoard />
          </div>
        )}

        {/* Long/Short Only */}
        {activeTab === "longshort" && (
          <div>
            <LongShortAccountRatio compact={false} />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-8 border-t border-[#2b3139] bg-[#1e2329]">
        <div className="max-w-[1920px] mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-400">
              <span className="font-bold text-yellow-400">Crypto Dashboard</span> - Real-time market data powered by Binance
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>⚡ Live Updates</span>
              <span>•</span>
              <span>📊 Market Analysis</span>
              <span>•</span>
              <span>🔒 Secure</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
