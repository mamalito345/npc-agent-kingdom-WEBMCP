import StrategyMap from "@/app/strategy-map";
import OperationalPanel from "@/app/operational-panel";
import WebMCPProvider from "@/app/webmcp-provider";
import ConversationPanel from "@/app/conversation-panel";

export default function Home() {
  return (
    <>
      <WebMCPProvider />
      <StrategyMap />
      <OperationalPanel />
      <ConversationPanel />
    </>
  );
}
