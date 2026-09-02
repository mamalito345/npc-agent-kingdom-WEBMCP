import WebMCPProvider from "@/app/webmcp-provider";
import DemoRuntime from "@/app/demo-runtime";
import GameRoot from "@/app/game-root";

export default function Home() {
  return (
    <>
      <WebMCPProvider />
      <DemoRuntime />
      <GameRoot />
    </>
  );
}
