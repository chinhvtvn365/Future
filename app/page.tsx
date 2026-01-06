import Image from "next/image";
import CoinGeckoMarquee from "@/components/CoinGeckoMarquee";
import MarketBoard from "@/components/MarketBoard";
import BinanceLikeBoard from "@/components/BinanceLikeBoard";
import FullScreenTerminal from "@/components/FullScreenTerminal"

export default function Home() {
  return (
    <div>
      {/* <CoinGeckoMarquee />
      <MarketBoard /> */}
       {/* <BinanceLikeBoard /> */}
       <FullScreenTerminal />
    </div>
  );
}
