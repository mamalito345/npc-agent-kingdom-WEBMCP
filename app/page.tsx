import StrategyMap from "@/app/strategy-map";
import OperationalPanel from "@/app/operational-panel";
import WebMCPProvider from "@/app/webmcp-provider";

export default function Home() {
  return (
    <>
      <WebMCPProvider />

      <StrategyMap />

      <OperationalPanel />
    </>
  );
}