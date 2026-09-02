import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  markDeliveredLordOrdersReceived,
} from "@/lib/lords/service";

import {
  openCommandInterrupt,
} from "@/lib/session/command-cycle";

import type {
  SimulationInterrupt,
} from "@/types/simulation";

export function processPoliticalDeliveries():
  SimulationInterrupt |
  undefined {
  const lordOrderIds =
    markDeliveredLordOrdersReceived();

  const world =
    getRuntimeWorldState();

  const newlyDeliveredAgreementIds:
    string[] = [];

  for (
    const agreement
    of Object.values(
      world.session.politics
        .agreements
    )
  ) {
    if (
      agreement.status !==
        "PROPOSED" ||
      agreement.deliveredAt !==
        undefined ||
      !agreement
        .proposalMessageId
    ) {
      continue;
    }

    const message =
      getRuntimeWorldState()
        .messages[
          agreement
            .proposalMessageId
        ];

    if (
      message?.deliveredAt ===
      undefined
    ) {
      continue;
    }

    updateRuntimeWorldState(
      (current) => ({
        ...current,
        session: {
          ...current.session,
          politics: {
            ...current.session
              .politics,
            agreements: {
              ...current.session
                .politics
                .agreements,
              [agreement.id]: {
                ...current.session
                  .politics
                  .agreements[
                    agreement.id
                  ],
                deliveredAt:
                  message
                    .deliveredAt,
              },
            },
          },
        },
      })
    );

    newlyDeliveredAgreementIds.push(
      agreement.id
    );
  }

  if (
    newlyDeliveredAgreementIds
      .length === 0 &&
    lordOrderIds.length ===
      0
  ) {
    return undefined;
  }

  const affectedPlayerIds =
    new Set<string>();

  for (
    const agreementId
    of newlyDeliveredAgreementIds
  ) {
    const agreement =
      getRuntimeWorldState()
        .session.politics
        .agreements[
          agreementId
        ];

    if (agreement) {
      affectedPlayerIds.add(
        agreement
          .proposedToPlayerId
      );
    }
  }

  for (
    const orderId
    of lordOrderIds
  ) {
    const order =
      getRuntimeWorldState()
        .session.lords
        .orders[
          orderId
        ];

    if (order) {
      affectedPlayerIds.add(
        order.playerId
      );
    }
  }

  const ids =
    [
      ...affectedPlayerIds,
    ];

  if (
    ids.length === 0 ||
    getRuntimeWorldState()
      .session
      .commandCycle
      .phase ===
      "interrupted"
  ) {
    return undefined;
  }

  const message =
    `Political courier delivery: ${newlyDeliveredAgreementIds.length} diplomatic proposal(s), ${lordOrderIds.length} lord order(s).`;

  const interrupt =
    openCommandInterrupt({
      type:
        "IMPORTANT_MESSAGE",
      affectedPlayerIds:
        ids,
      message,
    });

  return {
    eventId:
      interrupt.id,
    type:
      "IMPORTANT_MESSAGE",
    message,
    affectedPlayerIds:
      ids,
  };
}
