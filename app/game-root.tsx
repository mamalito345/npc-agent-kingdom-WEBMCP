"use client";

import {
  useSyncExternalStore,
} from "react";

import StrategyMap from "@/app/strategy-map";
import RealmCommandPanel from "@/app/realm-command-panel";
import OperationalPanel from "@/app/operational-panel";
import ConversationPanel from "@/app/conversation-panel";
import ObserverArena from "@/app/observer-arena";
import GameShell from "@/app/game-shell";
import KingdomHud from "@/app/kingdom-hud";
import CourtPanel from "@/app/court-panel";
import GameDrawer from "@/app/game-drawer";
import BattleBoard from "@/app/battle-board";
import CampaignPanel from "@/app/campaign-panel";
import GameAudio from "@/app/game-audio";
import StrategicCommandCenter from "@/app/strategic-command-center";

import {
  getDemoConfig,
  subscribeDemoConfig,
} from "@/lib/demo/config";

import {
  enterGame,
  getUiNavState,
  subscribeUiNav,
} from "@/lib/ui/navigation";

export default function GameRoot() {
  const demo =
    useSyncExternalStore(
      subscribeDemoConfig,
      getDemoConfig,
      getDemoConfig
    );

  const uiNav =
    useSyncExternalStore(
      subscribeUiNav,
      getUiNavState,
      getUiNavState
    );

  const entered =
    uiNav.entered;

  return (
    <>
      {!entered ? (
        <GameShell
          onEnterGame={
            enterGame
          }
        />
      ) : null}

      <div
        className={
          demo.mode ===
          "player"
            ? "pt-[72px]"
            : ""
        }
      >
        <StrategyMap />

        {demo.mode ===
        "player" ? (
          <>
            <KingdomHud />
            <RealmCommandPanel />
            <StrategicCommandCenter />
            <OperationalPanel />
            <CourtPanel />
            <CampaignPanel />
            <GameAudio />
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
