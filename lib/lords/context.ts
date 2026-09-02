import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getDeliveredCharacterKnowledge,
} from "@/lib/conversation/character-knowledge";

import {
  retrieveRelevantMemories,
} from "@/lib/conversation/memory";

import type {
  GmLordOrderContext,
  LordOrderRequest,
  LordProfile,
} from "@/types/lords";

export function buildGmLordOrderContext(
  profile: LordProfile,
  order: LordOrderRequest
): GmLordOrderContext {
  const world = getRuntimeWorldState();
  const lord = world.characters[profile.characterId];
  const ruler = world.characters[order.rulerCharacterId];

  const relationship =
    lord?.relationships[order.rulerCharacterId] ??
    profile.relationshipToRuler;

  const query = [
    order.type,
    order.targetNodeId,
    order.targetSettlementId,
    order.note,
  ]
    .filter(Boolean)
    .join(" ");

  const knownMilitarySituation = getDeliveredCharacterKnowledge(
    profile.characterId
  )
    .filter(
      (fact) =>
        fact.kind === "army" ||
        fact.kind === "battle" ||
        fact.kind === "settlement" ||
        fact.kind === "event"
    )
    .slice(-12)
    .map((fact) => ({
      subjectId: fact.subjectId,
      summary: fact.summary,
      confidence: fact.confidence,
      deliveredAt: fact.deliveredAt,
    }));

  const relevantMemories = retrieveRelevantMemories(
    profile.characterId,
    query,
    ruler ? [ruler.id] : [],
    8
  ).map((memory) => ({
    type: memory.type,
    summary: memory.summary,
    importance: memory.importance,
    createdAt: memory.createdAt,
  }));

  return {
    worldTimeMinutes: world.simulation.worldTimeMinutes,
    lord: {
      ...profile,
      controlledSettlementIds: [...profile.controlledSettlementIds],
      controlledArmyIds: [...profile.controlledArmyIds],
      basicTraits: { ...profile.basicTraits },
    },
    order,
    ruler: {
      characterId: order.rulerCharacterId,
      relationship,
    },
    knownMilitarySituation,
    relevantMemories,
    rules: [
      "You are acting as this NPC lord, not as the World Director and not as a PlayerSlot.",
      "Use only this lord's profile, relationship, memories, and delivered knowledge.",
      "Do not invent hidden canonical military information.",
      "Choose only ACCEPT, REFUSE, DELAY, NEGOTIATE, or PARTIAL_COMPLIANCE.",
      "A response may approve an action, but canonical effects still go through game services.",
    ],
  };
}
