"use client";

import {
  useState,
  useSyncExternalStore,
} from "react";

import StrategyMap from "@/app/strategy-map";
import OperationalPanel from "@/app/operational-panel";
import ConversationPanel from "@/app/conversation-panel";
import ObserverArena from "@/app/observer-arena";
import GameShell from "@/app/game-shell";
import KingdomHud from "@/app/kingdom-hud";
import CourtPanel from "@/app/court-panel";
import RealmMatters from "@/app/realm-matters";
import GameDrawer from "@/app/game-drawer";
import BattleBoard from "@/app/battle-board";

import {
  getDemoConfig,
  subscribeDemoConfig,
} from "@/lib/demo/config";

export default function GameRoot() {
  const [entered, setEntered] =
    useState(false);

  const demo =
    useSyncExternalStore(
      subscribeDemoConfig,
      getDemoConfig,
      getDemoConfig
    );

  return (
    <>
      {!entered ? (
        <GameShell
          onEnterGame={() =>
            setEntered(true)
          }
        />
      ) : null}

      <div className={demo.mode === "player" ? "pt-[72px]" : ""}>
        <StrategyMap />

        {demo.mode ===
        "player" ? (
          <>
            <KingdomHud />
            <OperationalPanel />
            <CourtPanel />
            <RealmMatters />
            <ConversationPanel />
            <BattleBoard />
            <GameDrawer />
          </>
        ) : (
          <ObserverArena />
        )}
      </div>
    </>
  );
}
