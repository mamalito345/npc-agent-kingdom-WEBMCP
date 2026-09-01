import StrategyMap from "@/app/strategy-map";
import WebMCPProvider from "@/app/webmcp-provider";

export default function Home() {
  return (
    <>
      <WebMCPProvider />

      <StrategyMap />
    </>
  );
}