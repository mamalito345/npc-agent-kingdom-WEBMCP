import { getWorldState } from "@/lib/world/state";
import TravelPanel from "./travel-panel";
import WebMCPProvider from "./webmcp-provider";

export default function Home() {
  const world = getWorldState();

  const player = world.player;
  const character = world.characters[player.characterId];
  const kingdom = world.kingdoms[character.kingdomId];

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">NPC Agent Kingdom</h1>

      <div className="mt-8 space-y-2">
        <p>
          <strong>Player:</strong> {character.name}
        </p>

        <p>
          <strong>Rank:</strong> {character.rank}
        </p>

        <p>
          <strong>Kingdom:</strong> {kingdom.name}
        </p>
      </div>

      <TravelPanel />
      <WebMCPProvider />
    </main>
  );
}