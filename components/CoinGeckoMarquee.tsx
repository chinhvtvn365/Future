"use client";

import Script from "next/script";

export default function CoinGeckoMarquee() {
  return (
    <div className="w-full">
      <Script
        src="https://widgets.coingecko.com/gecko-coin-price-marquee-widget.js"
        strategy="afterInteractive"
      />

      <gecko-coin-price-marquee-widget
        locale="en"
        coin-ids="pudgy-penguins,ethena,binancecoin,bitcoin,ethereum,plasma"
        initial-currency="usd"
      />
    </div>
  );
}
