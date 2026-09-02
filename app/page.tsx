import StrategyMap from "@/app/strategy-map";
import OperationalPanel from "@/app/operational-panel";
import WebMCPProvider from "@/app/webmcp-provider";
import ConversationPanel from "@/app/conversation-panel";
import DemoRuntime from "@/app/demo-runtime";
import DemoSetup from "@/app/demo-setup";
import ObserverArena from "@/app/observer-arena";

export default function Home() {
  return (
    <>
      <WebMCPProvider />
      <DemoRuntime />
      <DemoSetup />

      <main className="pr-[430px]">
        <StrategyMap />
        <OperationalPanel />
        <ConversationPanel />
      </main>

      <ObserverArena />
    </>
  );
}
