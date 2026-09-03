import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  validatePlayerAccess,
  validatePlayerCommandAccess,
} from "@/lib/session/access";

import {
  canConverse,
} from "@/lib/conversation/presence";

import {
  addCharacterKnowledge,
} from "@/lib/conversation/character-knowledge";

import {
  buildGmLordOrderContext,
} from "@/lib/lords/context";

import {
  getGmLordOrderModelAdapter,
} from "@/lib/lords/model";

import {
  getRealmControlRole,
} from "@/lib/demo/realm-control";

import {
  recruitUnits,
} from "@/lib/military/recruitment";

import {
  moveArmy,
  stopArmyMovement,
} from "@/lib/military/army-movement";

import {
  spawnCourier,
} from "@/lib/world/couriers";

import type {
  GmLordOrderDecision,
  LordOrderRequest,
  LordOrderResponseType,
  LordOrderStatus,
  LordOrderType,
  LordRuntimeState,
} from "@/types/lords";

export interface IssueCharacterOrderInput {
  type: LordOrderType;
  targetNodeId?: string;
  targetSettlementId?: string;
  risk?: number;
  note?: string;
}

function responseStatus(
  response: LordOrderResponseType
): LordOrderStatus {
  switch (response) {
    case "ACCEPT":
      return "ACCEPTED";
    case "REFUSE":
      return "REFUSED";
    case "NEGOTIATE":
      return "NEGOTIATING";
    case "DELAY":
      return "DELAYED";
    case "PARTIAL_COMPLIANCE":
      return "ACTIVE";
  }
}

export function inspectKingdomLords(
  sessionId: string,
  playerId: string
) {
  const access =
    validatePlayerAccess(
      sessionId,
      playerId
    );

  if (!access.ok) {
    return access;
  }

  const world =
    getRuntimeWorldState();

  const lords =
    Object.values(
      world.session.lords.profiles
    )
      .filter(
        (profile) =>
          profile.kingdomId ===
          access.player.kingdomId
      )
      .map((profile) => {
        const character =
          world.characters[
            profile.characterId
          ];

        const armies =
          profile.controlledArmyIds
            .map(
              (armyId) =>
                world.armies[armyId]
            )
            .filter(Boolean);

        return {
          characterId:
            profile.characterId,
          name:
            character?.name ??
            profile.characterId,
          title:
            profile.title,
          homeSettlementId:
            profile.homeSettlementId,
          controlledSettlementIds:
            [...profile.controlledSettlementIds],
          controlledArmyIds:
            [...profile.controlledArmyIds],
          loyalty:
            profile.loyalty,
          politicalPower:
            profile.politicalPower,
          relationshipToRuler:
            profile.relationshipToRuler,
          basicTraits: {
            ...profile.basicTraits,
          },
          localMilitaryStrength:
            armies.reduce(
              (total, army) =>
                total +
                army.unitIds.reduce(
                  (sum, unitId) =>
                    sum +
                    (
                      world.unitBlocks[unitId]
                        ?.currentSoldiers ??
                      0
                    ),
                  0
                ),
              0
            ),
          position:
            world.simulation.entityPositions[
              profile.characterId
            ] ?? null,
          armyPositions:
            Object.fromEntries(
              profile.controlledArmyIds.map(
                (armyId) => [
                  armyId,
                  world.simulation.entityPositions[
                    armyId
                  ] ?? null,
                ]
              )
            ),
        };
      });

  return {
    ok: true as const,
    kingdomId:
      access.player.kingdomId,
    lords,
  };
}

export function inspectLordOrders(
  sessionId: string,
  playerId: string
) {
  const access =
    validatePlayerAccess(
      sessionId,
      playerId
    );

  if (!access.ok) {
    return access;
  }

  return {
    ok: true as const,
    orders:
      Object.values(
        getRuntimeWorldState()
          .session.lords.orders
      ).filter(
        (order) =>
          order.playerId === playerId
      ),
  };
}

function resolveLordArmyTarget(
  order: LordOrderRequest,
  homeSettlementId: string
): string | undefined {
  if (
    order.type === "DEFEND_SETTLEMENT"
  ) {
    return (
      order.targetSettlementId ??
      homeSettlementId
    );
  }

  if (
    order.type === "REINFORCE" ||
    order.type === "BRING_ARMY"
  ) {
    return (
      order.targetNodeId ??
      order.targetSettlementId
    );
  }

  return undefined;
}

async function applyAcceptedOrderEffect(
  order: LordOrderRequest
): Promise<
  LordOrderRequest["canonicalEffect"]
> {
  const world =
    getRuntimeWorldState();

  const profile =
    world.session.lords.profiles[
      order.lordCharacterId
    ];

  if (!profile) {
    return {
      applied: false,
      summary:
        "Lord profile missing.",
    };
  }

  if (
    order.type === "RAISE_TROOPS"
  ) {
    const result =
      recruitUnits({
        settlementId:
          profile.homeSettlementId,
        unitType: "infantry",
        blocks: 1,
        actorId:
          profile.characterId,
      });

    if (result.ok) {
      return {
        applied: true,
        summary:
          `${profile.title} began raising infantry at ${profile.homeSettlementId}.`,
        referenceId:
          result.order.id,
      };
    }

    return {
      applied: false,
      summary:
        `${profile.title} accepted but recruitment could not begin: ${result.error}.`,
    };
  }

  if (
    order.type === "HOLD_POSITION"
  ) {
    for (
      const armyId
      of profile.controlledArmyIds
    ) {
      stopArmyMovement(
        armyId
      );
    }

    return {
      applied: true,
      summary:
        `${profile.title} committed ${profile.controlledArmyIds.length} household force(s) to hold current positions.`,
      referenceId:
        profile.controlledArmyIds[0],
    };
  }

  const targetNodeId =
    resolveLordArmyTarget(
      order,
      profile.homeSettlementId
    );

  if (!targetNodeId) {
    return {
      applied: false,
      summary:
        `${profile.title} accepted but the military order has no physical target.`,
    };
  }

  if (
    profile.controlledArmyIds.length ===
    0
  ) {
    return {
      applied: false,
      summary:
        `${profile.title} accepted politically, but no independent field army is attached to this lord.`,
    };
  }

  const results =
    profile.controlledArmyIds.map(
      (armyId) => ({
        armyId,
        result:
          moveArmy(
            armyId,
            targetNodeId
          ),
      })
    );

  const successful =
    results.filter(
      (entry) =>
        entry.result.ok
    );

  if (
    successful.length ===
    0
  ) {
    const firstFailure =
      results[0];

    return {
      applied: false,
      summary:
        `${profile.title} accepted, but the household army could not move: ${
          firstFailure &&
          !firstFailure.result.ok
            ? firstFailure.result.error
            : "UNKNOWN"
        }.`,
    };
  }

  return {
    applied: true,
    summary:
      `${profile.title} ordered ${successful.length} household force(s) toward ${targetNodeId}.`,
    referenceId:
      successful[0]?.armyId,
  };
}

async function finalizeDecision(
  order: LordOrderRequest,
  decision: GmLordOrderDecision,
  preserveLegacyResolved: boolean
) {
  const now =
    getRuntimeWorldState()
      .simulation.worldTimeMinutes;

  const resolved:
    LordOrderRequest = {
    ...order,
    status:
      preserveLegacyResolved
        ? "resolved"
        : responseStatus(
            decision.response
          ),
    response:
      decision.response,
    responseSummary:
      decision.summary,
    requestedCondition:
      decision.requestedCondition,
    resolvedAt:
      now,
  };

  if (
    decision.response === "ACCEPT" ||
    decision.response ===
      "PARTIAL_COMPLIANCE"
  ) {
    resolved.canonicalEffect =
      await applyAcceptedOrderEffect(
        resolved
      );

    if (
      !preserveLegacyResolved &&
      resolved.canonicalEffect
        ?.applied
    ) {
      resolved.status =
        "ACTIVE";
    }
  }

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        lords: {
          ...current.session.lords,
          orders: {
            ...current.session.lords.orders,
            [resolved.id]:
              resolved,
          },
        },
      },
    })
  );

  return resolved;
}

export async function resolveReceivedLordOrder(
  orderId: string
) {
  const world =
    getRuntimeWorldState();

  const order =
    world.session.lords.orders[
      orderId
    ];

  if (!order) {
    return {
      ok: false as const,
      error:
        "LORD_ORDER_NOT_FOUND",
    };
  }

  if (
    order.status !== "RECEIVED" &&
    order.status !== "pending"
  ) {
    return {
      ok: false as const,
      error:
        "LORD_ORDER_NOT_READY",
    };
  }

  const profile =
    world.session.lords.profiles[
      order.lordCharacterId
    ];

  if (!profile) {
    return {
      ok: false as const,
      error:
        "LORD_NOT_FOUND",
    };
  }

  /*
   * A lord only ever receives orders from the ruler of his own kingdom
   * (issueCharacterOrder already rejects any other kingdom's ruler with
   * NOT_AUTHORIZED). When that kingdom is HUMAN-controlled, the human
   * player commands their own lords directly, the same way they command
   * their own royal army -- no GM-adjudicated refusal. GM- and
   * Actor-LLM-controlled kingdoms keep the full loyalty/personality
   * based ACCEPT/REFUSE/DELAY/NEGOTIATE/PARTIAL_COMPLIANCE decision.
   */
  const decision:
    GmLordOrderDecision =
    getRealmControlRole(
      profile.kingdomId
    ) === "HUMAN"
      ? {
          response:
            "ACCEPT",
          summary:
            `${profile.title} carries out the ruler's direct command.`,
        }
      : await getGmLordOrderModelAdapter()
          .decideOrder(
            buildGmLordOrderContext(
              profile,
              order
            )
          );

  const resolved =
    await finalizeDecision(
      order,
      decision,
      order.status === "pending"
    );

  return {
    ok: true as const,
    order:
      resolved,
  };
}

export async function issueCharacterOrder(
  sessionId: string,
  playerId: string,
  lordCharacterId: string,
  input:
    IssueCharacterOrderInput
) {
  const access =
    validatePlayerCommandAccess(
      sessionId,
      playerId
    );

  if (!access.ok) {
    return access;
  }

  const world =
    getRuntimeWorldState();

  const profile =
    world.session.lords.profiles[
      lordCharacterId
    ];

  if (!profile) {
    return {
      ok: false as const,
      error:
        "LORD_NOT_FOUND",
    };
  }

  if (
    profile.kingdomId !==
    access.player.kingdomId
  ) {
    return {
      ok: false as const,
      error:
        "NOT_AUTHORIZED",
    };
  }

  const sequence =
    allocateSimulationSequence();

  const now =
    getRuntimeWorldState()
      .simulation.worldTimeMinutes;

  const presence =
    canConverse(
      access.player.characterId,
      lordCharacterId
    );

  const order:
    LordOrderRequest = {
    id:
      `lord-order-${sequence
        .toString()
        .padStart(6, "0")}`,
    playerId,
    rulerCharacterId:
      access.player.characterId,
    lordCharacterId,
    type:
      input.type,
    targetNodeId:
      input.targetNodeId,
    targetSettlementId:
      input.targetSettlementId,
    risk:
      Math.max(
        0,
        Math.min(
          100,
          input.risk ??
            50
        )
      ),
    note:
      input.note,
    issuedAt:
      now,
    status:
      presence.ok
        ? "pending"
        : "IN_TRANSIT",
  };

  if (!presence.ok) {
    const latest =
      getRuntimeWorldState();

    const senderPosition =
      latest.simulation.entityPositions[
        access.player.characterId
      ];

    const lordPosition =
      latest.simulation.entityPositions[
        lordCharacterId
      ];

    if (
      !senderPosition ||
      senderPosition.kind !== "node" ||
      !lordPosition ||
      lordPosition.kind !== "node"
    ) {
      return {
        ok: false as const,
        error:
          "REMOTE_ORDER_PARTY_NOT_AT_NODE",
      };
    }

    const dispatch =
      spawnCourier(
        access.player.characterId,
        lordCharacterId,
        `[LORD_ORDER:${order.id}] ${order.type}${order.note ? ` — ${order.note}` : ""}`,
        senderPosition.nodeId,
        lordPosition.nodeId
      );

    if (!dispatch.ok) {
      return {
        ok: false as const,
        error:
          dispatch.error,
      };
    }

    order.deliveryMessageId =
      dispatch.message.id;
  }

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        lords: {
          ...current.session.lords,
          orders: {
            ...current.session.lords.orders,
            [order.id]:
              order,
          },
        },
      },
    })
  );

  if (presence.ok) {
    return resolveReceivedLordOrder(
      order.id
    );
  }

  return {
    ok: true as const,
    order,
  };
}

export function markDeliveredLordOrdersReceived():
  string[] {
  const world =
    getRuntimeWorldState();

  const receivedIds:
    string[] = [];

  for (
    const order
    of Object.values(
      world.session.lords.orders
    )
  ) {
    if (
      order.status !== "IN_TRANSIT" ||
      !order.deliveryMessageId
    ) {
      continue;
    }

    const message =
      getRuntimeWorldState()
        .messages[
          order.deliveryMessageId
        ];

    if (
      message?.deliveredAt ===
      undefined
    ) {
      continue;
    }

    const received:
      LordOrderRequest = {
      ...order,
      status:
        "RECEIVED",
      receivedAt:
        message.deliveredAt,
    };

    updateRuntimeWorldState(
      (current) => ({
        ...current,
        session: {
          ...current.session,
          lords: {
            ...current.session.lords,
            orders: {
              ...current.session.lords.orders,
              [received.id]:
                received,
            },
          },
        },
      })
    );

    addCharacterKnowledge({
      characterId:
        order.lordCharacterId,
      subjectId:
        order.id,
      kind: "event",
      observedAt:
        order.issuedAt,
      deliveredAt:
        message.deliveredAt,
      source:
        "courier",
      confidence:
        "confirmed",
      summary:
        `Ruler order received: ${order.type}${order.note ? ` — ${order.note}` : ""}`,
      data: {
        lordOrderId:
          order.id,
        orderType:
          order.type,
      },
    });

    receivedIds.push(
      order.id
    );
  }

  return receivedIds;
}

export function exportLordRuntimeState(): string {
  return JSON.stringify(
    getRuntimeWorldState()
      .session.lords
  );
}

export function importLordRuntimeState(
  serialized: string
): void {
  const parsed =
    JSON.parse(
      serialized
    ) as LordRuntimeState;

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !parsed.profiles ||
    !parsed.orders
  ) {
    throw new Error(
      "INVALID_LORD_RUNTIME_STATE"
    );
  }

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        lords:
          parsed,
      },
    })
  );
}
