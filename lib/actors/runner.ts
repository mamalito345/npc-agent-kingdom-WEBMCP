import {
  allocateSimulationSequence,
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  validatePlayerCommandAccess,
} from "@/lib/session/access";

import {
  buildLlmPlayerContext,
} from "@/lib/actors/context";

import {
  executeLlmPlayerActionWithManagement,
} from "@/lib/actors/management-tool-executor";

import {
  isLlmPlayer,
} from "@/lib/actors/controller";

import type {
  LlmDecisionRecord,
  LlmPlayerActivationReason,
  LlmPlayerDecision,
  LlmPlayerModelAdapter,
  LlmPlayerPlanUpdate,
  StrategicPlan,
} from "@/types/actors";

const NORMAL_ACTION_BUDGET =
  6;
const CRISIS_ACTION_BUDGET =
  5;
const MAX_DECISION_HISTORY =
  200;

function actionBudget(
  reason:
    LlmPlayerActivationReason
): number {
  return reason ===
      "BATTLE_CRISIS" ||
    reason ===
      "ENEMY_CONTACT"
    ? CRISIS_ACTION_BUDGET
    : NORMAL_ACTION_BUDGET;
}

function upsertPlan(
  playerId:
    string,
  update:
    LlmPlayerPlanUpdate |
    undefined
): StrategicPlan | undefined {
  if (!update) {
    const world =
      getRuntimeWorldState();

    const activeId =
      world.session
        .llmPlayers
        .activePlanByPlayerId[
          playerId
        ];

    return activeId
      ? world.session
          .llmPlayers
          .plans[
            activeId
          ]
      : undefined;
  }

  const world =
    getRuntimeWorldState();

  const activeId =
    world.session
      .llmPlayers
      .activePlanByPlayerId[
        playerId
      ];

  const existing =
    activeId
      ? world.session
          .llmPlayers
          .plans[
            activeId
          ]
      : undefined;

  const now =
    world.simulation
      .worldTimeMinutes;

  let plan:
    StrategicPlan;

  if (existing) {
    plan = {
      ...existing,

      goal:
        update.goal,

      targetId:
        update.targetId,

      priority:
        Math.max(
          0,
          Math.min(
            100,
            update.priority
          )
        ),

      status:
        update.status ??
        "active",

      nextActionAt:
        update.nextActionAt,

      updatedAt:
        now,
    };
  } else {
    const sequence =
      allocateSimulationSequence();

    plan = {
      id:
        `llm-plan-${sequence
          .toString()
          .padStart(
            6,
            "0"
          )}`,

      playerId,

      goal:
        update.goal,

      targetId:
        update.targetId,

      priority:
        Math.max(
          0,
          Math.min(
            100,
            update.priority
          )
        ),

      status:
        update.status ??
        "active",

      nextActionAt:
        update.nextActionAt,

      createdAt:
        now,

      updatedAt:
        now,
    };
  }

  updateRuntimeWorldState(
    (current) => ({
      ...current,

      session: {
        ...current.session,

        llmPlayers: {
          ...current.session
            .llmPlayers,

          plans: {
            ...current.session
              .llmPlayers
              .plans,

            [plan.id]:
              plan,
          },

          activePlanByPlayerId: {
            ...current.session
              .llmPlayers
              .activePlanByPlayerId,

            [playerId]:
              plan.status ===
                "active"
                ? plan.id
                : undefined,
          },
        },
      },
    })
  );

  return plan;
}

function recordDecision(
  record:
    LlmDecisionRecord
): void {
  updateRuntimeWorldState(
    (current) => ({
      ...current,

      session: {
        ...current.session,

        llmPlayers: {
          ...current.session
            .llmPlayers,

          lastActivationAt: {
            ...current.session
              .llmPlayers
              .lastActivationAt,

            [record.playerId]:
              record
                .activatedAt,
          },

          decisions: [
            ...current.session
              .llmPlayers
              .decisions,
            record,
          ].slice(
            -MAX_DECISION_HISTORY
          ),
        },
      },
    })
  );
}

function observationSummary(
  decision:
    LlmPlayerDecision
): string {
  const requested =
    decision.actions
      .map(
        (action) =>
          action.tool
      )
      .join(
        ", "
      );

  return requested
    ? `Requested tools: ${requested}`
    : "No gameplay action requested.";
}

export type RunLlmPlayerResult =
  | {
      ok:
        false;

      error:
        | "PLAYER_NOT_LLM"
        | "NOT_CURRENT_PLAYER"
        | "COMMAND_WINDOW_CLOSED"
        | "CONTEXT_NOT_AVAILABLE"
        | "MODEL_ERROR";

      detail?:
        string;
    }
  | {
      ok:
        true;

      record:
        LlmDecisionRecord;

      passedWindow:
        boolean;
    };

export async function runLlmPlayerActivation(
  playerId:
    string,
  reason:
    LlmPlayerActivationReason,
  adapter:
    LlmPlayerModelAdapter
): Promise<RunLlmPlayerResult> {
  const world =
    getRuntimeWorldState();

  if (
    !isLlmPlayer(
      playerId
    )
  ) {
    return {
      ok:
        false,

      error:
        "PLAYER_NOT_LLM",
    };
  }

  const access =
    validatePlayerCommandAccess(
      world.session.id,
      playerId
    );

  if (
    !access.ok
  ) {
    return {
      ok:
        false,

      error:
        access.error ===
          "NOT_CURRENT_PLAYER"
          ? "NOT_CURRENT_PLAYER"
          : "COMMAND_WINDOW_CLOSED",

      detail:
        access.error,
    };
  }

  const context =
    buildLlmPlayerContext(
      playerId,
      reason
    );

  if (!context) {
    return {
      ok:
        false,

      error:
        "CONTEXT_NOT_AVAILABLE",
    };
  }

  let decision:
    LlmPlayerDecision;

  try {
    decision =
      await adapter
        .generateDecision(
          context
        );
  } catch (
    error
  ) {
    return {
      ok:
        false,

      error:
        "MODEL_ERROR",

      detail:
        error instanceof
          Error
          ? error.message
          : String(
              error
            ),
    };
  }

  const budget =
    actionBudget(
      reason
    );

  const requestedActions =
    decision.actions
      .slice(
        0,
        budget
      );

  const actionResults = [];

  for (
    const action
    of requestedActions
  ) {
    actionResults.push(
      await executeLlmPlayerActionWithManagement(
        world.session.id,
        playerId,
        action
      )
    );

    const current =
      getRuntimeWorldState()
        .session
        .commandCycle;

    if (
      current.phase ===
        "executing" ||
      current.currentPlayerId !==
        playerId
    ) {
      break;
    }
  }

  const plan =
    upsertPlan(
      playerId,
      decision
        .planUpdate
    );

  const activatedAt =
    getRuntimeWorldState()
      .simulation
      .worldTimeMinutes;

  const sequence =
    allocateSimulationSequence();

  /*
   * The command window ends ONLY when the model explicitly includes
   * the pass_command_window tool in its actions -- that case is
   * already handled above by the ordinary action-execution loop
   * (tool-executor.ts's "pass_command_window" case calls
   * passPlayerCommandWindow itself), which also correctly breaks the
   * loop the moment currentPlayerId changes.
   *
   * There used to also be a second, automatic mechanism here that
   * passed the window right after ANY activation unless the model
   * explicitly set passWindow:false -- which meant a single normal
   * action (move an army, recruit troops, ...) with no explicit
   * pass_command_window call would still silently end the turn, by
   * default, every time. That made "the actor LLM used a tool and its
   * turn just ended" the normal case instead of the exception. It is
   * removed: passedWindow now only reports whether the turn already
   * ended as a real consequence of the model's own actions, never as
   * an unrequested side effect of returning here. If the model does
   * not call pass_command_window, runWorldCatchUp's own loop simply
   * reactivates the same player again (bounded by its 40-iteration
   * guard) so it can keep acting within the same window.
   */
  const cycleAfterActions =
    getRuntimeWorldState()
      .session
      .commandCycle;

  const passedWindow =
    cycleAfterActions.currentPlayerId !==
      playerId ||
    cycleAfterActions.phase ===
      "executing";

  const record:
    LlmDecisionRecord = {
    id:
      `llm-decision-${sequence
        .toString()
        .padStart(
          6,
          "0"
        )}`,

    playerId,

    activatedAt,

    activationReason:
      reason,

    observationSummary:
      observationSummary(
        decision
      ),

    requestedActions,

    actionResults,

    decisionSummary:
      decision
        .decisionSummary
        .slice(
          0,
          500
        ),

    planId:
      plan?.id,
  };

  recordDecision(
    record
  );

  return {
    ok:
      true,

    record,

    passedWindow,
  };
}
