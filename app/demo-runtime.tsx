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
  getCurrentLlmActivation,
  runWorldCatchUp,
} from "@/lib/actors/orchestrator";

import {
  passPlayerCommandWindow,
} from "@/lib/session/player-actions";

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
  RemoteWorldDirectorProposalAdapter,
} from "@/lib/ai/remote-adapters";

const gmCharacterAdapter =
  new RemoteGmCharacterAdapter();

const gmLordAdapter =
  new RemoteGmLordOrderAdapter();

const eventDirectorAdapter =
  new RemoteEventDirectorAdapter();

const proposalDirectorAdapter =
  new RemoteWorldDirectorProposalAdapter();

const SPEED_DELAY:
  Record<
    1 | 4 | 8,
    number
  > = {
  1: 1800,
  4: 500,
  8: 250,
};

/*
 * ============================================================
 * WORLD DRIVER (browser dev-server / non-WebMCP path)
 * ============================================================
 *
 * This is the browser-tab equivalent of the WebMCP identity-guard's
 * runWorldCatchUp() hook (see lib/webmcp/identity-guard.ts): when the
 * game is opened directly via `npm run dev` instead of through a WebMCP
 * host, nothing else calls runWorldCatchUp(), so this component is what
 * has to keep the world moving.
 *
 * The previous version of this loop rescheduled itself only by relying
 * on a React effect dependency array (world time / commandCycle phase /
 * currentPlayerId). That is fragile: an LLM activation that takes some
 * actions but does not itself change worldTime, phase or currentPlayerId
 * (a very normal thing for a command window that isn't finished yet)
 * left the effect's dependencies unchanged, so the effect never re-ran
 * and the timer was simply never rescheduled -- the whole simulation
 * silently froze until something external (a manual refresh) kicked it.
 * That is the root cause behind "I pass my turn and the actor never
 * comes" and "nothing is happening" reports.
 *
 * This version is a self-rescheduling loop: every tick reschedules the
 * next tick itself (in a finally block), independent of React re-renders,
 * and delegates all turn/time advancement to the same runWorldCatchUp()
 * used by the WebMCP path, so both entry points share one, already
 * battle-tested piece of logic instead of two divergent ones.
 */
export default function DemoRuntime() {
  const config =
    useSyncExternalStore(
      subscribeDemoConfig,
      getDemoConfig,
      getDemoConfig
    );

  const world =
    useSyncExternalStore(
      subscribeWorldState,
      getWorldState,
      getWorldState
    );

  const modelFailures =
    useRef<
      Record<
        string,
        number
      >
    >({});

  const lastDirectorProposalDay =
    useRef(-1);

  const runningRef =
    useRef(false);

  useEffect(() => {
    setGmCharacterModelAdapter(
      gmCharacterAdapter
    );

    setGmLordOrderModelAdapter(
      gmLordAdapter
    );
  }, []);

  useEffect(() => {
    if (
      !config.running ||
      world.simulation
        .paused
    ) {
      runningRef.current =
        false;

      return;
    }

    if (
      runningRef.current
    ) {
      // A tick loop is already running (started by an earlier mount /
      // config flip); do not start a second, overlapping one.
      return;
    }

    runningRef.current =
      true;

    let cancelled =
      false;

    let timer:
      number | undefined;

    async function tick(): Promise<void> {
      if (cancelled) {
        return;
      }

      const liveConfig =
        getDemoConfig();

      if (
        !liveConfig.running ||
        getWorldState()
          .simulation
          .paused
      ) {
        runningRef.current =
          false;

        return;
      }

      try {
        const beforeActivation =
          getCurrentLlmActivation();

        const result =
          await runWorldCatchUp();

        if (
          result.stoppedFor ===
          "MODEL_ERROR"
        ) {
          const stuckPlayerId =
            beforeActivation?.playerId ??
            getCurrentLlmActivation()
              ?.playerId;

          if (
            stuckPlayerId
          ) {
            const count =
              (
                modelFailures
                  .current[
                    stuckPlayerId
                  ] ??
                0
              ) + 1;

            modelFailures.current[
              stuckPlayerId
            ] =
              count;

            if (
              count >=
              2
            ) {
              passPlayerCommandWindow(
                getWorldState()
                  .session.id,
                stuckPlayerId
              );

              modelFailures.current[
                stuckPlayerId
              ] =
                0;
            }
          }
        } else if (
          result.activations >
          0
        ) {
          modelFailures.current =
            {};
        }

        if (
          liveConfig.gmEnabled
        ) {
          try {
            await runDueDirectorEvents(
              eventDirectorAdapter
            );
          } catch (error) {
            console.warn(
              "[GM] event opportunity skipped after provider failure",
              error instanceof Error
                ? error.message
                : error
            );
          }

          const day =
            Math.floor(
              getWorldState()
                .simulation
                .worldTimeMinutes /
                1440
            );

          if (
            day !==
            lastDirectorProposalDay
              .current
          ) {
            lastDirectorProposalDay.current =
              day;

            try {
              await runDirectorTurn(
                proposalDirectorAdapter
              );
            } catch (error) {
              console.warn(
                "[GM] director proposal turn skipped after provider failure",
                error instanceof Error
                  ? error.message
                  : error
              );
            }
          }
        }
      } catch (error) {
        console.error(
          "[WorldDriver] tick failed",
          error
        );
      } finally {
        if (!cancelled) {
          timer =
            window.setTimeout(
              () => {
                void tick();
              },
              SPEED_DELAY[
                getDemoConfig()
                  .speed
              ]
            );
        } else {
          runningRef.current =
            false;
        }
      }
    }

    void tick();

    return () => {
      cancelled = true;
      runningRef.current =
        false;

      if (timer !== undefined) {
        window.clearTimeout(
          timer
        );
      }
    };
  }, [
    config.running,
    world.simulation
      .paused,
  ]);

  return null;
}
