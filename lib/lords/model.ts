import type {
  GmLordOrderContext,
  GmLordOrderDecision,
  GmLordOrderModelAdapter,
} from "@/types/lords";

function clamp(
  value: number
): number {
  return Math.max(
    0,
    Math.min(
      100,
      value
    )
  );
}

function defaultDecision(
  context:
    GmLordOrderContext
): GmLordOrderDecision {
  const {
    lord,
    order,
    ruler,
  } = context;

  const traits =
    lord.basicTraits;

  const relationshipScore =
    clamp(
      (
        ruler.relationship +
        100
      ) /
        2
    );

  let score =
    lord.loyalty *
      0.45 +
    relationshipScore *
      0.22 +
    traits.honor *
      0.12 +
    traits.diplomacy *
      0.06 -
    traits.ambition *
      0.06;

  const risk =
    clamp(
      order.risk
    );

  score -=
    risk *
    (
      traits.caution /
      100
    ) *
    0.22;

  if (
    order.type ===
      "DEFEND_SETTLEMENT" &&
    order.targetSettlementId &&
    lord
      .controlledSettlementIds
      .includes(
        order
          .targetSettlementId
      )
  ) {
    score += 12;
  }

  if (
    order.type ===
      "RAISE_TROOPS" &&
    lord.loyalty <
      35 &&
    risk >=
      70
  ) {
    return {
      response:
        "REFUSE",
      summary:
        `${lord.title} refuses a costly levy while loyalty is dangerously low.`,
    };
  }

  if (score >= 68) {
    return {
      response:
        "ACCEPT",
      summary:
        `${lord.title} accepts the ruler's order.`,
    };
  }

  if (score >= 58) {
    return {
      response:
        "PARTIAL_COMPLIANCE",
      summary:
        `${lord.title} agrees in principle but limits the commitment.`,
      requestedCondition:
        "Limit the cost and duration of the commitment.",
    };
  }

  if (score >= 48) {
    if (
      risk >= 60
    ) {
      return {
        response:
          "DELAY",
        summary:
          `${lord.title} delays while assessing the danger.`,
      };
    }

    return {
      response:
        "NEGOTIATE",
      summary:
        `${lord.title} asks for terms before committing fully.`,
      requestedCondition:
        "Clarify the crown's support and risk sharing.",
    };
  }

  if (score >= 36) {
    return {
      response:
        "NEGOTIATE",
      summary:
        `${lord.title} will not comply without concessions.`,
      requestedCondition:
        "Political or material concessions are required.",
    };
  }

  return {
    response:
      "REFUSE",
    summary:
      `${lord.title} refuses the order.`,
  };
}

const defaultAdapter:
  GmLordOrderModelAdapter = {
  decideOrder(
    context:
      GmLordOrderContext
  ): GmLordOrderDecision {
    return defaultDecision(
      context
    );
  },
};

let adapter:
  GmLordOrderModelAdapter =
    defaultAdapter;

export function getGmLordOrderModelAdapter():
  GmLordOrderModelAdapter {
  return adapter;
}

export function setGmLordOrderModelAdapter(
  nextAdapter:
    GmLordOrderModelAdapter
): void {
  adapter =
    nextAdapter;
}

export function resetGmLordOrderModelAdapter():
  void {
  adapter =
    defaultAdapter;
}
