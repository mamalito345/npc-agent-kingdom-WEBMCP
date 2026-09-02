"use client";

import {
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";

import {
  getDemoConfig,
  subscribeDemoConfig,
} from "@/lib/demo/config";

import {
  getWorldState,
  subscribeWorldState,
} from "@/lib/world/state";

import {
  runPendingLlmCommandWindows,
} from "@/lib/actors/orchestrator";

import {
  passPlayerCommandWindow,
} from "@/lib/session/player-actions";

import {
  advanceWorldBy,
} from "@/lib/world/simulation";

import {
  runDueDirectorEvents,
} from "@/lib/events/runner";

import {
  runDirectorTurn,
} from "@/lib/director/gateway";

import {
  setGmCharacterModelAdapter,
} from "@/lib/conversation/model";

import {
  setGmLordOrderModelAdapter,
} from "@/lib/lords/model";

import {
  RemoteEventDirectorAdapter,
  RemoteGmCharacterAdapter,
  RemoteGmLordOrderAdapter,
  RemotePlayerLlmAdapter,
  RemoteWorldDirectorProposalAdapter,
} from "@/lib/ai/remote-adapters";

const playerAdapter = new RemotePlayerLlmAdapter();
const gmCharacterAdapter = new RemoteGmCharacterAdapter();
const gmLordAdapter = new RemoteGmLordOrderAdapter();
const eventDirectorAdapter = new RemoteEventDirectorAdapter();
const proposalDirectorAdapter = new RemoteWorldDirectorProposalAdapter();

const SPEED_DELAY: Record<1 | 4 | 8, number> = {
  1: 1800,
  4: 500,
  8: 250,
};

export default function DemoRuntime() {
  const config = useSyncExternalStore(
    subscribeDemoConfig,
    getDemoConfig,
    getDemoConfig
  );

  const world = useSyncExternalStore(
    subscribeWorldState,
    getWorldState,
    getWorldState
  );

  const busy = useRef(false);
  const modelFailures = useRef<Record<string, number>>({});
  const lastDirectorProposalDay = useRef(-1);

  useEffect(() => {
    setGmCharacterModelAdapter(gmCharacterAdapter);
    setGmLordOrderModelAdapter(gmLordAdapter);
  }, []);

  useEffect(() => {
    if (!config.running || world.simulation.paused) {
      return;
    }

    const timer = window.setTimeout(async () => {
      if (busy.current) {
        return;
      }

      busy.current = true;

      try {
        const cycle = getWorldState().session.commandCycle;

        if (cycle.phase !== "executing" && cycle.currentPlayerId) {
          const player = getWorldState().session.players[cycle.currentPlayerId];

          if (player?.controllerType === "webmcp_llm") {
            const results = await runPendingLlmCommandWindows(playerAdapter, 1);
            const failed = results.find((result) => !result.ok);

            if (failed) {
              const count = (modelFailures.current[player.id] ?? 0) + 1;
              modelFailures.current[player.id] = count;

              if (count >= 2) {
                passPlayerCommandWindow(getWorldState().session.id, player.id);
                modelFailures.current[player.id] = 0;
              }
            } else {
              modelFailures.current[player.id] = 0;
            }
          }

          return;
        }

        if (cycle.phase === "executing") {
          advanceWorldBy(60);

          if (config.gmEnabled) {
            try {
              await runDueDirectorEvents(eventDirectorAdapter);
            } catch (error) {
              console.warn(
                "[GM] event opportunity skipped after provider failure",
                error instanceof Error ? error.message : error
              );
            }

            const day = Math.floor(
              getWorldState().simulation.worldTimeMinutes / 1440
            );

            if (day !== lastDirectorProposalDay.current) {
              lastDirectorProposalDay.current = day;

              try {
                await runDirectorTurn(proposalDirectorAdapter);
              } catch (error) {
                console.warn(
                  "[GM] director proposal turn skipped after provider failure",
                  error instanceof Error ? error.message : error
                );
              }
            }
          }
        }
      } finally {
        busy.current = false;
      }
    }, SPEED_DELAY[config.speed]);

    return () => window.clearTimeout(timer);
  }, [
    config.gmEnabled,
    config.running,
    config.speed,
    world.simulation.paused,
    world.simulation.worldTimeMinutes,
    world.session.commandCycle.phase,
    world.session.commandCycle.currentPlayerId,
  ]);

  return null;
}
