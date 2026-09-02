import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

export type ObserverFeedKind =
  | "PLAYER_LLM"
  | "TOOL"
  | "CONVERSATION"
  | "DIPLOMACY"
  | "GM_CHARACTER"
  | "WORLD_DIRECTOR"
  | "BATTLE"
  | "EVENT";

export interface ObserverFeedEntry {
  id: string;
  time: number;
  kind: ObserverFeedKind;
  kingdomId?: string;
  actor: string;
  title: string;
  summary: string;
  details?: string[];
}

export function getObserverFeed(limit = 120): ObserverFeedEntry[] {
  const world = getRuntimeWorldState();
  const entries: ObserverFeedEntry[] = [];

  for (const decision of world.session.llmPlayers.decisions) {
    const player = world.session.players[decision.playerId];

    entries.push({
      id: decision.id,
      time: decision.activatedAt,
      kind: "PLAYER_LLM",
      kingdomId: player?.kingdomId,
      actor: player?.displayName ?? decision.playerId,
      title: `PLAYER LLM — ${decision.activationReason}`,
      summary: decision.decisionSummary,
      details: [
        `Observed: ${decision.observationSummary}`,
        ...decision.actionResults.map(
          (result) =>
            `${result.tool}: ${result.ok ? "PASS" : "REJECTED"}`
        ),
      ],
    });

    for (let index = 0; index < decision.actionResults.length; index += 1) {
      const action = decision.requestedActions[index];
      const result = decision.actionResults[index];

      entries.push({
        id: `${decision.id}:tool:${index}`,
        time: decision.activatedAt,
        kind: "TOOL",
        kingdomId: player?.kingdomId,
        actor: player?.displayName ?? decision.playerId,
        title: `TOOL — ${result.tool}`,
        summary: result.ok ? "Canonical result: PASS" : "Canonical result: REJECTED",
        details: action
          ? [
              `Arguments: ${JSON.stringify(action.args)}`,
              `Result: ${JSON.stringify(result.result).slice(0, 500)}`,
            ]
          : undefined,
      });
    }
  }

  for (const trace of world.session.director.events.traces) {
    entries.push({
      id: trace.id,
      time: trace.timestamp,
      kind: "WORLD_DIRECTOR",
      actor: "GM LLM — WORLD DIRECTOR",
      title: trace.selectedDefinitionId
        ? `Selected ${trace.selectedDefinitionId}`
        : "Director opportunity",
      summary: trace.decisionSummary ?? trace.activationReason,
      details: [
        `Eligible events: ${trace.eligibleEventCount}`,
        `Validator: ${trace.validatorStatus}`,
        `Canonical: ${trace.canonicalResult ?? "No canonical effect"}`,
        `Information: ${trace.playerKnowledge}`,
      ],
    });
  }

  for (const conversation of Object.values(world.session.conversations)) {
    for (const turn of conversation.turns) {
      const speaker = world.characters[turn.speakerCharacterId];

      entries.push({
        id: turn.id,
        time: turn.createdAtWorldTime,
        kind: "CONVERSATION",
        kingdomId: speaker?.kingdomId,
        actor: speaker?.name ?? turn.speakerCharacterId,
        title: turn.speakerRole === "npc" ? "GM NPC RESPONSE" : "PLAYER CONVERSATION",
        summary: turn.text,
      });
    }
  }

  for (const message of Object.values(world.messages)) {
    const sender = world.characters[message.senderId];
    const recipient = world.characters[message.recipientId];

    entries.push({
      id: `message:${message.id}`,
      time: message.deliveredAt ?? message.createdAt,
      kind: "DIPLOMACY",
      kingdomId: sender?.kingdomId,
      actor: sender?.name ?? message.senderId,
      title: `MESSAGE → ${recipient?.name ?? message.recipientId}`,
      summary: message.content,
      details: [
        message.deliveredAt === undefined
          ? "Status: IN TRANSIT"
          : `Delivered at: ${message.deliveredAt}`,
      ],
    });
  }

  for (const order of Object.values(world.session.lords.orders)) {
    const lord = world.characters[order.lordCharacterId];

    if (!order.response) {
      continue;
    }

    entries.push({
      id: `lord:${order.id}`,
      time: order.resolvedAt ?? order.issuedAt,
      kind: "GM_CHARACTER",
      kingdomId: lord?.kingdomId,
      actor: lord?.name ?? order.lordCharacterId,
      title: `GM LORD DECISION — ${order.response}`,
      summary: order.responseSummary ?? order.type,
      details: order.requestedCondition
        ? [`Condition: ${order.requestedCondition}`]
        : undefined,
    });
  }

  for (const battle of Object.values(world.battles)) {
    if (!battle.lastRound) {
      continue;
    }

    entries.push({
      id: `battle:${battle.id}:${battle.lastRound.id}`,
      time: battle.lastRound.resolvedAt,
      kind: "BATTLE",
      actor: "CANONICAL BATTLE ENGINE",
      title: `${battle.id} — ${battle.currentPhase}`,
      summary: battle.lastRound.summary,
    });
  }

  return entries
    .sort((a, b) => b.time - a.time || b.id.localeCompare(a.id))
    .slice(0, limit);
}
