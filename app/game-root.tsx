"use client";

import {
  useEffect,
  useRef,
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
  getWorldState,
} from "@/lib/world/state";

import {
  beginCampaign,
} from "@/lib/demo/campaign";

import {
  hasBrowserSave,
  loadDemoFromBrowser,
} from "@/lib/demo/persistence";

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

  // Real games do not make you click "Continue" every time you open
  // them: they either resume where you left off or, failing that,
  // quietly start a fresh session instead of getting stuck on a menu.
  // This runs exactly once per app load (never again after a manual
  // "Exit to menu"): if a browser save exists, load it and jump
  // straight into the game; if there is no save, or loading it throws
  // (corrupt/incompatible save), fall back to auto-starting a new
  // campaign with the same default human/actor assignment the manual
  // "New Campaign" screen uses. If even that cannot proceed (no
  // players in the session at all), it leaves entered=false so the
  // normal GameShell menu is still there as a fallback.
  const bootstrappedRef =
    useRef(false);

  useEffect(() => {
    if (bootstrappedRef.current) {
      return;
    }

    bootstrappedRef.current = true;

    if (getUiNavState().entered) {
      return;
    }

    if (hasBrowserSave()) {
      try {
        if (loadDemoFromBrowser()) {
          enterGame();
          return;
        }
      } catch {
        // Corrupt or incompatible save -- fall through to a fresh
        // campaign below instead of leaving the player stuck.
      }
    }

    const world =
      getWorldState();

    const players =
      Object.values(
        world.session.players
      ).filter(
        (player) =>
          player.active
      );

    const humanPlayerId =
      world.session.localPlayerId;

    const actorPlayerId =
      players.find(
        (player) =>
          player.id !==
          humanPlayerId
      )?.id ??
      "";

    if (
      !humanPlayerId ||
      !actorPlayerId
    ) {
      return;
    }

    const result =
      beginCampaign({
        humanPlayerId,
        actorPlayerId,
      });

    if (result.ok) {
      enterGame();
    }
  }, []);

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
