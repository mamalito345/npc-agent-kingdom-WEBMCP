import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  setActiveMovement,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  validatePlayerCommandAccess,
} from "@/lib/session/access";

import {
  spawnCourier,
  COURIER_SPEED_KM_PER_HOUR,
} from "@/lib/world/couriers";

import {
  findRoute,
} from "@/lib/map/paths";

import {
  createMovement,
} from "@/lib/world/movement";

import {
  getGmCharacterModelAdapter,
} from "@/lib/conversation/model";

import {
  getDeliveredCharacterKnowledge,
} from "@/lib/conversation/character-knowledge";

import {
  retrieveRelevantMemories,
} from "@/lib/conversation/memory";

import {
  getNpcPersonality,
} from "@/data/npc-personalities";

import type {
  Courier,
  WorldMessage,
} from "@/types/courier";

import type {
  GmCharacterContext,
} from "@/types/conversation";

const OUTGOING_PREFIX =
  "[LORD_MESSAGE] ";

const REPLY_PREFIX =
  "[LORD_REPLY] ";

function clean(
  value: string
): string {
  return value
    .replace(
      OUTGOING_PREFIX,
      ""
    )
    .replace(
      REPLY_PREFIX,
      ""
    );
}

export function getLordCorrespondence(
  rulerCharacterId: string,
  lordCharacterId: string
) {
  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  return Object.values(
    getRuntimeWorldState()
      .messages
  )
    .filter(
      (message) =>
        (
          message.senderId ===
            rulerCharacterId &&
          message.recipientId ===
            lordCharacterId
        ) ||
        (
          message.senderId ===
            lordCharacterId &&
          message.recipientId ===
            rulerCharacterId
        )
    )
    .filter(
      (message) =>
        message.content.startsWith(
          OUTGOING_PREFIX
        ) ||
        message.content.startsWith(
          REPLY_PREFIX
        )
    )
    .sort(
      (a, b) =>
        a.createdAt -
          b.createdAt ||
        a.id.localeCompare(
          b.id
        )
    )
    .map(
      (message) => ({
        id:
          message.id,
        direction:
          message.senderId ===
          rulerCharacterId
            ? "outgoing" as const
            : "incoming" as const,
        text:
          clean(
            message.content
          ),
        createdAt:
          message.createdAt,
        delivered:
          message.deliveredAt !==
            undefined &&
          message.deliveredAt <=
            now,
        deliveredAt:
          message.deliveredAt,
      })
    );
}

function directMessage(
  senderId: string,
  recipientId: string,
  content: string
): WorldMessage {
  const sequence =
    allocateSimulationSequence();

  const now =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  const message:
    WorldMessage = {
    id:
      `message-${sequence
        .toString()
        .padStart(
          6,
          "0"
        )}`,
    senderId,
    recipientId,
    content,
    createdAt:
      now,
    deliveredAt:
      now,
  };

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      messages: {
        ...current.messages,
        [message.id]:
          message,
      },
    })
  );

  return message;
}

async function generateLordReply(
  rulerCharacterId: string,
  lordCharacterId: string,
  text: string
): Promise<string> {
  const world =
    getRuntimeWorldState();

  const lord =
    world.characters[
      lordCharacterId
    ];

  if (!lord) {
    return "The lord could not be reached.";
  }

  const now =
    world.simulation
      .worldTimeMinutes;

  const context:
    GmCharacterContext = {
    worldTimeMinutes:
      now,
    identity: {
      id:
        lord.id,
      name:
        lord.name,
      kingdomId:
        lord.kingdomId,
      rank:
        lord.rank,
    },
    personality:
      getNpcPersonality(
        lordCharacterId
      ),
    physicalContext: {
      position:
        world.simulation
          .entityPositions[
            lordCharacterId
          ] ??
        null,
      presenceReason:
        null,
    },
    interlocutor: {
      characterId:
        rulerCharacterId,
      relationship:
        lord.relationships[
          rulerCharacterId
        ] ??
        0,
    },
    knowledge:
      getDeliveredCharacterKnowledge(
        lordCharacterId
      )
        .slice()
        .sort(
          (a, b) =>
            b.deliveredAt -
            a.deliveredAt
        )
        .slice(
          0,
          12
        ),
    recentDeliveredMessages:
      Object.values(
        world.messages
      )
        .filter(
          (message) =>
            message.recipientId ===
              lordCharacterId &&
            message.deliveredAt !==
              undefined &&
            message.deliveredAt <=
              now
        )
        .sort(
          (a, b) =>
            (
              b.deliveredAt ??
              0
            ) -
              (
                a.deliveredAt ??
                0
              )
        )
        .slice(
          0,
          10
        )
        .map(
          (message) => ({
            id:
              message.id,
            senderId:
              message.senderId,
            content:
              clean(
                message.content
              ),
            createdAt:
              message.createdAt,
            deliveredAt:
              message.deliveredAt as number,
          })
        ),
    relevantMemories:
      retrieveRelevantMemories(
        lordCharacterId,
        text,
        [
          rulerCharacterId,
        ],
        10
      ),
    transcript: [
      {
        id:
          `lord-letter-${now}`,
        speakerCharacterId:
          rulerCharacterId,
        speakerRole:
          "player",
        text,
        createdAtWorldTime:
          now,
      },
    ],
    rules: [
      "You are replying to your ruler by courier.",
      "Reply in character and keep it concise.",
      "Use only delivered knowledge, relationships, memories and the message.",
      "Do not invent exact hidden enemy state.",
      "A casual message cannot itself mutate armies or politics.",
      "If the ruler wants a military action, explain willingness but canonical action must still be issued as a lord order.",
    ],
  };

  try {
    const result =
      await getGmCharacterModelAdapter()
        .generateResponse(
          context
        );

    return result.text;
  } catch {
    const profile =
      world.session
        .lords
        .profiles[
          lordCharacterId
        ];

    if (
      profile &&
      profile.loyalty <
      35
    ) {
      return "I have received your letter. I will consider what you ask, but I will not promise what my household cannot bear.";
    }

    return "Your message reached me. I remain attentive to the needs of the realm and await any formal command.";
  }
}

function scheduleReplyCourier(
  lordCharacterId: string,
  rulerCharacterId: string,
  text: string,
  startNodeId: string,
  destinationNodeId: string,
  startAt: number
) {
  const route =
    findRoute(
      startNodeId,
      destinationNodeId
    );

  if (!route) {
    return;
  }

  const messageSequence =
    allocateSimulationSequence();

  const courierSequence =
    allocateSimulationSequence();

  const messageId =
    `message-${messageSequence
      .toString()
      .padStart(
        6,
        "0"
      )}`;

  const courierId =
    `courier-${courierSequence
      .toString()
      .padStart(
        6,
        "0"
      )}`;

  const message:
    WorldMessage = {
    id:
      messageId,
    senderId:
      lordCharacterId,
    recipientId:
      rulerCharacterId,
    content:
      `${REPLY_PREFIX}${text}`,
    createdAt:
      startAt,
  };

  const courier:
    Courier = {
    id:
      courierId,
    senderId:
      lordCharacterId,
    targetId:
      rulerCharacterId,
    messageId,
    destinationNodeId,
    speedKmPerHour:
      COURIER_SPEED_KM_PER_HOUR,
    status:
      "traveling",
    createdAt:
      startAt,
  };

  const movement =
    createMovement(
      `movement-${courierSequence
        .toString()
        .padStart(
          6,
          "0"
        )}`,
      courierId,
      route,
      COURIER_SPEED_KM_PER_HOUR,
      startAt
    );

  updateRuntimeWorldState(
    (current) => ({
      ...current,
      messages: {
        ...current.messages,
        [message.id]:
          message,
      },
      couriers: {
        ...current.couriers,
        [courier.id]:
          courier,
      },
      simulation: {
        ...current.simulation,
        entityPositions: {
          ...current
            .simulation
            .entityPositions,
          [courier.id]: {
            kind:
              "node",
            nodeId:
              startNodeId,
          },
        },
      },
    })
  );

  setActiveMovement(
    movement
  );
}

export async function sendLordCorrespondence(
  sessionId: string,
  playerId: string,
  lordCharacterId: string,
  text: string
) {
  const access =
    validatePlayerCommandAccess(
      sessionId,
      playerId
    );

  if (!access.ok) {
    return access;
  }

  const trimmed =
    text.trim();

  if (!trimmed) {
    return {
      ok:
        false as const,
      error:
        "EMPTY_MESSAGE" as const,
    };
  }

  const world =
    getRuntimeWorldState();

  const profile =
    world.session
      .lords
      .profiles[
        lordCharacterId
      ];

  if (
    !profile ||
    profile.kingdomId !==
      access.player.kingdomId
  ) {
    return {
      ok:
        false as const,
      error:
        "LORD_NOT_FOUND" as const,
    };
  }

  const rulerId =
    access.player
      .characterId;

  const rulerPosition =
    world.simulation
      .entityPositions[
        rulerId
      ];

  const lordPosition =
    world.simulation
      .entityPositions[
        lordCharacterId
      ];

  if (
    !rulerPosition ||
    rulerPosition.kind !==
      "node" ||
    !lordPosition ||
    lordPosition.kind !==
      "node"
  ) {
    return {
      ok:
        false as const,
      error:
        "PARTY_NOT_AT_NODE" as const,
    };
  }

  const replyText =
    await generateLordReply(
      rulerId,
      lordCharacterId,
      trimmed
    );

  if (
    rulerPosition.nodeId ===
    lordPosition.nodeId
  ) {
    const outgoing =
      directMessage(
        rulerId,
        lordCharacterId,
        `${OUTGOING_PREFIX}${trimmed}`
      );

    directMessage(
      lordCharacterId,
      rulerId,
      `${REPLY_PREFIX}${replyText}`
    );

    return {
      ok:
        true as const,
      messageId:
        outgoing.id,
      mode:
        "present" as const,
    };
  }

  const dispatch =
    spawnCourier(
      rulerId,
      lordCharacterId,
      `${OUTGOING_PREFIX}${trimmed}`,
      rulerPosition.nodeId,
      lordPosition.nodeId
    );

  if (!dispatch.ok) {
    return dispatch;
  }

  const afterDispatch =
    getRuntimeWorldState();

  const outgoingMovement =
    afterDispatch
      .simulation
      .activeMovements[
        dispatch.courier.id
      ];

  const replyStartAt =
    (
      outgoingMovement
        ?.estimatedArrivalAt ??
      afterDispatch
        .simulation
        .worldTimeMinutes
    ) +
    30;

  /*
   * Reply movement starts only after the outgoing courier is expected
   * to arrive, then physically travels back. This gives correspondence
   * a real round-trip delay based on map distance.
   */
  scheduleReplyCourier(
    lordCharacterId,
    rulerId,
    replyText,
    lordPosition.nodeId,
    rulerPosition.nodeId,
    replyStartAt
  );

  return {
    ok:
      true as const,
    messageId:
      dispatch.message.id,
    courierId:
      dispatch.courier.id,
    mode:
      "courier" as const,
    expectedLordReceiptAt:
      outgoingMovement
        ?.estimatedArrivalAt,
  };
}
