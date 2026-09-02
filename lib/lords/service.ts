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
  buildGmLordOrderContext,
} from "@/lib/lords/context";

import {
  getGmLordOrderModelAdapter,
} from "@/lib/lords/model";

import {
  recruitUnits,
} from "@/lib/military/recruitment";

import type {
  LordOrderRequest,
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

export function inspectKingdomLords(
  sessionId: string,
  playerId: string
) {
  const access = validatePlayerAccess(
    sessionId,
    playerId
  );

  if (!access.ok) {
    return access;
  }

  const world = getRuntimeWorldState();

  const lords = Object.values(
    world.session.lords.profiles
  )
    .filter(
      (profile) =>
        profile.kingdomId ===
        access.player.kingdomId
    )
    .map((profile) => {
      const character =
        world.characters[profile.characterId];

      return {
        characterId: profile.characterId,
        name:
          character?.name ??
          profile.characterId,
        title: profile.title,
        homeSettlementId:
          profile.homeSettlementId,
        controlledSettlementIds: [
          ...profile.controlledSettlementIds,
        ],
        controlledArmyIds: [
          ...profile.controlledArmyIds,
        ],
        loyalty: profile.loyalty,
        politicalPower:
          profile.politicalPower,
        relationshipToRuler:
          profile.relationshipToRuler,
        basicTraits: {
          ...profile.basicTraits,
        },
        localMilitaryStrength:
          character?.army ?? 0,
        position:
          world.simulation
            .entityPositions[
              profile.characterId
            ] ?? null,
      };
    })
    .sort(
      (a, b) =>
        b.politicalPower -
          a.politicalPower ||
        a.characterId.localeCompare(
          b.characterId
        )
    );

  return {
    ok: true as const,
    kingdomId:
      access.player.kingdomId,
    lords,
  };
}

async function applyAcceptedOrderEffect(
  order: LordOrderRequest
): Promise<LordOrderRequest["canonicalEffect"]> {
  const world = getRuntimeWorldState();
  const profile =
    world.session.lords.profiles[
      order.lordCharacterId
    ];

  if (!profile) {
    return {
      applied: false,
      summary: "Lord profile missing.",
    };
  }

  if (
    order.type === "RAISE_TROOPS"
  ) {
    const blocks =
      order.response ===
      "PARTIAL_COMPLIANCE"
        ? 1
        : 1;

    const result = recruitUnits({
      settlementId:
        profile.homeSettlementId,
      unitType: "infantry",
      blocks,
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
    return {
      applied: true,
      summary:
        `${profile.title} committed to hold current positions.`,
    };
  }

  if (
    profile.controlledArmyIds.length ===
    0
  ) {
    return {
      applied: false,
      summary:
        `${profile.title} accepted politically, but no independent field army is currently attached to this lord.`,
    };
  }

  return {
    applied: false,
    summary:
      "Lord-controlled field-army execution is deferred until a lord contingent is attached.",
  };
}

export async function issueCharacterOrder(
  sessionId: string,
  playerId: string,
  lordCharacterId: string,
  input: IssueCharacterOrderInput
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
      error: "LORD_NOT_FOUND",
    };
  }

  if (
    profile.kingdomId !==
    access.player.kingdomId
  ) {
    return {
      ok: false as const,
      error: "NOT_AUTHORIZED",
    };
  }

  const presence = canConverse(
    access.player.characterId,
    lordCharacterId
  );

  if (!presence.ok) {
    return {
      ok: false as const,
      error: "LORD_NOT_PRESENT",
      guidance:
        "Use send_message for a distant lord; direct character orders require physical/council presence.",
    };
  }

  const sequence =
    allocateSimulationSequence();

  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  const order: LordOrderRequest = {
    id:
      `lord-order-${sequence
        .toString()
        .padStart(6, "0")}`,
    playerId,
    rulerCharacterId:
      access.player.characterId,
    lordCharacterId,
    type: input.type,
    targetNodeId:
      input.targetNodeId,
    targetSettlementId:
      input.targetSettlementId,
    risk:
      Math.max(
        0,
        Math.min(
          100,
          input.risk ?? 50
        )
      ),
    note: input.note,
    issuedAt: now,
    status: "pending",
  };

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        lords: {
          ...current.session.lords,
          orders: {
            ...current.session
              .lords.orders,
            [order.id]:
              order,
          },
        },
      },
    })
  );

  const context =
    buildGmLordOrderContext(
      profile,
      order
    );

  const decision =
    await getGmLordOrderModelAdapter()
      .decideOrder(context);

  const resolved: LordOrderRequest = {
    ...order,
    status: "resolved",
    response:
      decision.response,
    responseSummary:
      decision.summary,
    resolvedAt:
      getRuntimeWorldState()
        .simulation
        .worldTimeMinutes,
  };

  if (
    decision.response ===
      "ACCEPT" ||
    decision.response ===
      "PARTIAL_COMPLIANCE"
  ) {
    resolved.canonicalEffect =
      await applyAcceptedOrderEffect(
        resolved
      );
  }

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      session: {
        ...current.session,
        lords: {
          ...current.session.lords,
          orders: {
            ...current.session
              .lords.orders,
            [resolved.id]:
              resolved,
          },
        },
      },
    })
  );

  return {
    ok: true as const,
    order:
      getRuntimeWorldState()
        .session
        .lords
        .orders[
          resolved.id
        ],
  };
}

export function exportLordRuntimeState(): string {
  return JSON.stringify(
    getRuntimeWorldState()
      .session
      .lords
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
        lords: parsed,
      },
    })
  );
}
