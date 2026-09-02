import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  stopEntityMovement,
} from "@/lib/world/movement";

import {
  playerControlsArmy,
  playerControlsCharacter,
} from "@/lib/session/players";

import type {
  StrategicOrder,
  StrategicOrderPayload,
  StrategicOrderType,
} from "@/types/session";

export interface IssueStrategicOrderInput {
  playerId: string;

  type: StrategicOrderType;

  payload: StrategicOrderPayload;
}

export type IssueStrategicOrderResult =
  | {
      ok: false;

      error:
        | "PLAYER_NOT_FOUND"
        | "PLAYER_NOT_ACTIVE"
        | "NOT_CURRENT_PLAYER"
        | "NOT_AUTHORIZED";
    }
  | {
      ok: true;

      order: StrategicOrder;
    };

function validateAuthorization(
  input: IssueStrategicOrderInput
): boolean {
  switch (input.type) {
    case "move_character": {
      if (
        !(
          "characterId" in
          input.payload
        )
      ) {
        return false;
      }

      return playerControlsCharacter(
        input.playerId,
        input.payload.characterId
      );
    }

    case "move_army":
    case "intercept_army":
    case "hold_army": {
      if (
        !(
          "armyId" in
          input.payload
        )
      ) {
        return false;
      }

      return playerControlsArmy(
        input.playerId,
        input.payload.armyId
      );
    }
  }
}

export function issueStrategicOrder(
  input: IssueStrategicOrderInput
): IssueStrategicOrderResult {
  const world =
    getRuntimeWorldState();

  const player =
    world.session.players[
      input.playerId
    ];

  if (!player) {
    return {
      ok: false,
      error: "PLAYER_NOT_FOUND",
    };
  }

  if (!player.active) {
    return {
      ok: false,
      error: "PLAYER_NOT_ACTIVE",
    };
  }

  const cycle =
    world.session.commandCycle;

  /*
   * Planning / interrupt:
   * only the current player may issue.
   *
   * Execution:
   * human/UI orders may be queued
   * without opening a new LLM window.
   */
  if (
    cycle.phase !== "executing" &&
    cycle.currentPlayerId !==
      input.playerId
  ) {
    return {
      ok: false,
      error: "NOT_CURRENT_PLAYER",
    };
  }

  if (
    !validateAuthorization(
      input
    )
  ) {
    return {
      ok: false,
      error: "NOT_AUTHORIZED",
    };
  }

  const sequence =
    allocateSimulationSequence();

  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  const order:
    StrategicOrder = {
    id:
      `strategic-order-${sequence
        .toString()
        .padStart(
          6,
          "0"
        )}`,

    playerId:
      input.playerId,

    type:
      input.type,

    payload:
      input.payload,

    issuedAt:
      now,

    updatedAt:
      now,

    status:
      "queued",
  };

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      session: {
        ...current.session,

        orders: {
          ...current.session
            .orders,

          [order.id]:
            order,
        },
      },
    })
  );

  return {
    ok: true,
    order,
  };
}

export type CancelStrategicOrderResult =
  | {
      ok: false;

      error:
        | "ORDER_NOT_FOUND"
        | "NOT_AUTHORIZED"
        | "ORDER_ALREADY_FINISHED";
    }
  | {
      ok: true;

      order: StrategicOrder;
    };

function stopPhysicalEffectOfOrder(
  order: StrategicOrder
): void {
  if (
    order.status !==
    "executing"
  ) {
    return;
  }

  switch (order.type) {
    case "move_character": {
      if (
        "characterId" in
        order.payload
      ) {
        stopEntityMovement(
          order.payload
            .characterId
        );
      }

      return;
    }

    case "move_army":
    case "intercept_army": {
      if (
        "armyId" in
        order.payload
      ) {
        stopEntityMovement(
          order.payload.armyId
        );
      }

      return;
    }

    case "hold_army": {
      return;
    }
  }
}

export function cancelStrategicOrder(
  playerId: string,
  orderId: string
): CancelStrategicOrderResult {
  const world =
    getRuntimeWorldState();

  const order =
    world.session.orders[
      orderId
    ];

  if (!order) {
    return {
      ok: false,
      error: "ORDER_NOT_FOUND",
    };
  }

  if (
    order.playerId !==
    playerId
  ) {
    return {
      ok: false,
      error: "NOT_AUTHORIZED",
    };
  }

  if (
    order.status ===
      "completed" ||
    order.status ===
      "cancelled" ||
    order.status ===
      "failed"
  ) {
    return {
      ok: false,
      error:
        "ORDER_ALREADY_FINISHED",
    };
  }

  /*
   * If the order already has a
   * physical movement, freeze the
   * entity exactly where it is.
   *
   * No teleport back to a node.
   */
  stopPhysicalEffectOfOrder(
    order
  );

  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  const cancelled:
    StrategicOrder = {
    ...order,

    status:
      "cancelled",

    updatedAt:
      now,

    completedAt:
      now,
  };

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      session: {
        ...current.session,

        orders: {
          ...current.session
            .orders,

          [orderId]:
            cancelled,
        },
      },
    })
  );

  return {
    ok: true,
    order: cancelled,
  };
}

/*
 * Player-facing order query.
 *
 * observation.ts
 * WebMCP tools
 * UI
 *
 * all depend on this export.
 */
export function getPlayerOrders(
  playerId: string
): StrategicOrder[] {
  return Object.values(
    getRuntimeWorldState()
      .session
      .orders
  )
    .filter(
      (order) =>
        order.playerId ===
        playerId
    )
    .sort(
      (a, b) =>
        a.issuedAt -
          b.issuedAt ||
        a.id.localeCompare(
          b.id
        )
    );
}

/*
 * Useful for simulation /
 * debugging without leaking
 * orders between players.
 */
export function getStrategicOrder(
  orderId: string
): StrategicOrder | undefined {
  return getRuntimeWorldState()
    .session
    .orders[
      orderId
    ];
}

export function getExecutingStrategicOrders():
  StrategicOrder[] {
  return Object.values(
    getRuntimeWorldState()
      .session
      .orders
  )
    .filter(
      (order) =>
        order.status ===
        "executing"
    )
    .sort(
      (a, b) =>
        a.issuedAt -
          b.issuedAt ||
        a.id.localeCompare(
          b.id
        )
    );
}

export function getQueuedStrategicOrders():
  StrategicOrder[] {
  return Object.values(
    getRuntimeWorldState()
      .session
      .orders
  )
    .filter(
      (order) =>
        order.status ===
        "queued"
    )
    .sort(
      (a, b) =>
        a.issuedAt -
          b.issuedAt ||
        a.id.localeCompare(
          b.id
        )
    );
}