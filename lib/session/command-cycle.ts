import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  CommandInterrupt,
  CommandInterruptType,
} from "@/types/session";

export type PassCommandWindowResult =
  | {
      ok:
        false;

      error:
        | "PLAYER_NOT_REQUIRED"
        | "NOT_CURRENT_PLAYER"
        | "ALREADY_READY";
    }
  | {
      ok:
        true;

      phase:
        | "planning"
        | "executing"
        | "interrupted";

      nextPlayerId?:
        string;
    };

function getNextUnreadyPlayer(
  required:
    string[],
  ready:
    string[]
): string | undefined {
  return required.find(
    (playerId) =>
      !ready.includes(
        playerId
      )
  );
}

export function passCommandWindow(
  playerId:
    string
): PassCommandWindowResult {
  const world =
    getRuntimeWorldState();

  const cycle =
    world.session
      .commandCycle;

  if (
    !cycle
      .requiredPlayerIds
      .includes(
        playerId
      )
  ) {
    return {
      ok:
        false,

      error:
        "PLAYER_NOT_REQUIRED",
    };
  }

  if (
    cycle.currentPlayerId !==
    playerId
  ) {
    return {
      ok:
        false,

      error:
        "NOT_CURRENT_PLAYER",
    };
  }

  if (
    cycle.readyPlayerIds
      .includes(
        playerId
      )
  ) {
    return {
      ok:
        false,

      error:
        "ALREADY_READY",
    };
  }

  const ready = [
    ...cycle.readyPlayerIds,
    playerId,
  ];

  const nextPlayerId =
    getNextUnreadyPlayer(
      cycle.requiredPlayerIds,
      ready
    );

  if (
    nextPlayerId
  ) {
    updateRuntimeWorldState(
      (current) => ({
        ...current,

        session: {
          ...current.session,

          commandCycle: {
            ...current
              .session
              .commandCycle,

            readyPlayerIds:
              ready,

            currentPlayerId:
              nextPlayerId,
          },
        },
      })
    );

    return {
      ok:
        true,

      phase:
        cycle.phase,

      nextPlayerId,
    };
  }

  const now =
    world.simulation
      .worldTimeMinutes;

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      session: {
        ...current.session,

        commandCycle: {
          ...current
            .session
            .commandCycle,

          phase:
            "executing",

          readyPlayerIds:
            ready,

          currentPlayerId:
            undefined,

          executionStartedAt:
            now,

          interrupt:
            undefined,
        },
      },
    })
  );

  return {
    ok:
      true,

    phase:
      "executing",
  };
}

export interface OpenInterruptInput {
  type:
    CommandInterruptType;

  affectedPlayerIds:
    string[];

  message:
    string;
}

export function openCommandInterrupt(
  input:
    OpenInterruptInput
): CommandInterrupt {
  const world =
    getRuntimeWorldState();

  const orderedPlayerIds =
    world.session
      .commandCycle
      .playerOrder;

  const uniquePlayers =
    [
      ...new Set(
        input
          .affectedPlayerIds
      ),
    ]
      .filter(
        (playerId) =>
          world.session
            .players[
              playerId
            ]?.active ===
          true
      )
      .sort(
        (a, b) =>
          orderedPlayerIds.indexOf(
            a
          ) -
          orderedPlayerIds.indexOf(
            b
          )
      );

  const existing =
    world.session
      .commandCycle
      .interrupt;

  if (
    world.session
      .commandCycle
      .phase ===
      "interrupted" &&
    existing
  ) {
    const mergedPlayers =
      [
        ...new Set([
          ...existing
            .affectedPlayerIds,

          ...uniquePlayers,
        ]),
      ].sort(
        (a, b) =>
          orderedPlayerIds.indexOf(
            a
          ) -
          orderedPlayerIds.indexOf(
            b
          )
      );

    const mergedMessage =
      existing.message.includes(
        input.message
      )
        ? existing.message
        : `${existing.message} ${input.message}`;

    const merged:
      CommandInterrupt = {
      ...existing,

      affectedPlayerIds:
        mergedPlayers,

      message:
        mergedMessage,
    };

    updateRuntimeWorldState(
      (current) => ({
        ...current,

        session: {
          ...current.session,

          commandCycle: {
            ...current
              .session
              .commandCycle,

            requiredPlayerIds:
              mergedPlayers,

            interrupt:
              merged,

            currentPlayerId:
              current
                .session
                .commandCycle
                .currentPlayerId ??
              mergedPlayers[0],
          },
        },
      })
    );

    return merged;
  }

  const sequence =
    allocateSimulationSequence();

  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  const interrupt:
    CommandInterrupt = {
    id:
      `command-interrupt-${sequence
        .toString()
        .padStart(
          6,
          "0"
        )}`,

    type:
      input.type,

    createdAt:
      now,

    affectedPlayerIds:
      uniquePlayers,

    message:
      input.message,

    resolvedPlayerIds:
      [],
  };

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      session: {
        ...current.session,

        commandCycle: {
          ...current
            .session
            .commandCycle,

          phase:
            uniquePlayers.length >
            0
              ? "interrupted"
              : "executing",

          requiredPlayerIds:
            uniquePlayers,

          readyPlayerIds:
            [],

          currentPlayerId:
            uniquePlayers[0],

          windowOpenedAt:
            now,

          interrupt:
            uniquePlayers.length >
            0
              ? interrupt
              : undefined,
        },
      },
    })
  );

  return interrupt;
}

export function openPlanningRound():
  void {
  const world =
    getRuntimeWorldState();

  const players =
    world.session
      .commandCycle
      .playerOrder
      .filter(
        (playerId) =>
          world.session
            .players[
              playerId
            ]?.active
      );

  const now =
    world.simulation
      .worldTimeMinutes;

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      session: {
        ...current.session,

        commandCycle: {
          phase:
            "planning",

          playerOrder: [
            ...current
              .session
              .commandCycle
              .playerOrder,
          ],

          requiredPlayerIds:
            players,

          readyPlayerIds:
            [],

          currentPlayerId:
            players[0],

          windowOpenedAt:
            now,
        },
      },
    })
  );
}

export function canWorldExecute():
  boolean {
  return (
    getRuntimeWorldState()
      .session
      .commandCycle
      .phase ===
    "executing"
  );
}