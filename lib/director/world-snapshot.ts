import {
  getRuntimeWorldState,
} from "@/lib/world/runtime";

import {
  getArmyUnits,
  getArmySoldierCount,
} from "@/lib/military/army-queries";

import {
  getKingdomLore,
} from "@/data/lore";

import {
  getMapNode,
} from "@/lib/map/graph";

import {
  getBattleTerrainDefense,
  getTerrainModifier,
} from "@/lib/military/battle-modifiers";

import type {
  GmWorldSnapshot,
} from "@/types/director";

const RECENT_MESSAGE_LIMIT =
  30;

const RECENT_EVENT_LIMIT =
  30;

const REALM_FACT_LIMIT =
  30;

function unitSoldiers(
  armyId: string,
  type:
    | "infantry"
    | "cavalry"
    | "siege"
): number {
  return getArmyUnits(
    armyId
  )
    .filter(
      (unit) =>
        unit.type ===
        type
    )
    .reduce(
      (sum, unit) =>
        sum +
        unit.currentSoldiers,
      0
    );
}


/*
 * Turns a map node's terrain into the same readable defense info the
 * GM/actor system prompts vaguely reference in prose ("hills give the
 * defender a bonus") but were never actually given as data. Previously
 * this modifier only existed inside battle-resolution math, applied
 * silently after a fight started -- invisible to strategic planning.
 */
function terrainInfoForNode(
  nodeId: string
): {
  terrain: string;
  terrainDefenseTier: string;
  terrainDefenseModifier: number;
} {
  const node =
    getMapNode(
      nodeId
    );

  const terrain =
    node?.terrain ??
    "plains";

  const tier =
    getBattleTerrainDefense(
      terrain
    );

  return {
    terrain,
    terrainDefenseTier:
      tier,
    terrainDefenseModifier:
      getTerrainModifier(
        tier
      ),
  };
}

export function buildGmWorldSnapshot():
  GmWorldSnapshot {
  const world =
    getRuntimeWorldState();

  const lordArmyIds =
    new Set(
      Object.values(
        world.session.lords
          .profiles
      ).flatMap(
        (profile) =>
          profile
            .controlledArmyIds
      )
    );

  const activePlans =
    Object.values(
      world.session.llmPlayers
        .plans
    ).filter(
      (plan) =>
        plan.status ===
        "active"
    );

  return {
    worldTimeMinutes:
      world.simulation
        .worldTimeMinutes,

    campaignControl: {
      humanPlayerId:
        world.session
          .campaignControl
          .humanPlayerId,
      actorPlayerId:
        world.session
          .campaignControl
          .actorPlayerId,
      roleByKingdomId: {
        ...world.session
          .campaignControl
          .roleByKingdomId,
      },
    },

    kingdoms:
      Object.values(
        world.kingdoms
      ).map(
        (kingdom) => ({
          id:
            kingdom.id,
          name:
            kingdom.name,
          rulerId:
            kingdom.rulerId,
          treasury:
            kingdom.treasury,
          food:
            kingdom.food,
          stability:
            kingdom.stability,
          relations: {
            ...kingdom.relations,
          },
          history:
            getKingdomLore(
              kingdom.id
            )?.aiHistory,
          settlementIds: [
            ...kingdom
              .settlementIds,
          ],
          armyIds:
            Object.values(
              world.armies
            )
              .filter(
                (army) =>
                  army.ownerId ===
                  kingdom.id &&
                  army.status !==
                    "destroyed"
              )
              .map(
                (army) =>
                  army.id
              ),
        })
      ),

    settlements:
      Object.values(
        world.settlements
      ).map(
        (settlement) => ({
          id:
            settlement.id,
          name:
            settlement.name,
          kingdomId:
            settlement.kingdomId,
          controllerKingdomId:
            settlement
              .controllerKingdomId ??
            settlement.kingdomId,
          ownerId:
            settlement.ownerId,
          type:
            settlement.type,
          fortificationLevel:
            settlement
              .fortificationLevel ??
            0,
          resources: {
            ...settlement.resources,
          },
          dailyProduction: {
            ...settlement
              .dailyProduction,
          },
          ...terrainInfoForNode(
            settlement.id
          ),
        })
      ),

    armies:
      Object.values(
        world.armies
      )
        .filter(
          (army) =>
            army.status !==
            "destroyed"
        )
        .map(
          (army) => {
            const movement =
              world.simulation
                .activeMovements[
                  army.id
                ];

            const commander =
              army.commanderId
                ? world.characters[
                    army
                      .commanderId
                  ]
                : undefined;

            return {
              id:
                army.id,
              ownerId:
                army.ownerId,
              commanderId:
                army.commanderId,
              commanderName:
                commander?.name,
              status:
                army.status,
              soldiers:
                getArmySoldierCount(
                  army.id
                ),
              infantry:
                unitSoldiers(
                  army.id,
                  "infantry"
                ),
              cavalry:
                unitSoldiers(
                  army.id,
                  "cavalry"
                ),
              siege:
                unitSoldiers(
                  army.id,
                  "siege"
                ),
              morale:
                army.morale,
              supplyState:
                army.supply.state,
              foodSupply:
                army.supply
                  .foodSupply,
              fundingState:
                army.funding.state,
              unpaidDays:
                army.funding
                  .unpaidDays,
              position:
                world.simulation
                  .entityPositions[
                    army.id
                  ] ?? null,
              movementDestination:
                movement
                  ?.destinationNodeId,
              movementEta:
                movement
                  ?.estimatedArrivalAt,
              independentLordArmy:
                lordArmyIds.has(
                  army.id
                ),
              ...(() => {
                const armyPosition =
                  world.simulation
                    .entityPositions[
                      army.id
                    ];

                if (
                  !armyPosition ||
                  armyPosition.kind !==
                    "node"
                ) {
                  return {};
                }

                const info =
                  terrainInfoForNode(
                    armyPosition.nodeId
                  );

                return {
                  positionTerrain:
                    info.terrain,
                  positionTerrainDefenseTier:
                    info.terrainDefenseTier,
                  positionTerrainDefenseModifier:
                    info
                      .terrainDefenseModifier,
                };
              })(),
            };
          }
        ),

    lords:
      Object.values(
        world.session.lords
          .profiles
      ).map(
        (profile) => ({
          characterId:
            profile.characterId,
          name:
            world.characters[
              profile.characterId
            ]?.name ??
            profile.characterId,
          title:
            profile.title,
          kingdomId:
            profile.kingdomId,
          homeSettlementId:
            profile
              .homeSettlementId,
          loyalty:
            profile.loyalty,
          politicalPower:
            profile
              .politicalPower,
          relationshipToRuler:
            profile
              .relationshipToRuler,
          traits: {
            ...profile
              .basicTraits,
          },
          controlledSettlementIds: [
            ...profile
              .controlledSettlementIds,
          ],
          controlledArmyIds: [
            ...profile
              .controlledArmyIds,
          ],
        })
      ),

    lordOrders:
      Object.values(
        world.session.lords
          .orders
      )
        .sort(
          (a, b) =>
            b.issuedAt -
              a.issuedAt ||
            a.id.localeCompare(
              b.id
            )
        )
        .slice(
          0,
          30
        ),

    wars:
      Object.values(
        world.wars
      ),

    battles:
      Object.values(
        world.battles
      ),

    sieges:
      Object.values(
        world.sieges
      ),

    diplomacy: {
      agreements:
        Object.values(
          world.session
            .politics
            .agreements
        ),
      promises:
        Object.values(
          world.session
            .politics
            .promises
        ),
      relationships:
        Object.values(
          world.session
            .politics
            .relationships
        ),
    },

    borders:
      Object.values(
        world.session.borders
          .incidents
      ),

    realmKnowledge:
      Object.values(
        world.session.knowledge
      ).map(
        (knowledge) => {
          const player =
            world.session
              .players[
                knowledge.playerId
              ];

          return {
            playerId:
              knowledge.playerId,
            kingdomId:
              player?.kingdomId ??
              "unknown",
            facts:
              knowledge.facts
                .slice(
                  -REALM_FACT_LIMIT
                )
                .map(
                  (fact) => ({
                    subjectId:
                      fact.subjectId,
                    kind:
                      fact.kind,
                    deliveredAt:
                      fact.deliveredAt,
                    confidence:
                      fact.confidence,
                    summary:
                      fact.summary,
                  })
                ),
          };
        }
      ),

    activePlans,

    recentMessages:
      Object.values(
        world.messages
      )
        .sort(
          (a, b) =>
            b.createdAt -
              a.createdAt ||
            a.id.localeCompare(
              b.id
            )
        )
        .slice(
          0,
          RECENT_MESSAGE_LIMIT
        ),

    recentEvents: [
      ...world.simulation
        .resolvedEvents,
      ...Object.values(
        world.session.director
          .events.instances
      ),
    ]
      .slice(
        -RECENT_EVENT_LIMIT
      ),

    directorRuntime: {
      eventBudget:
        world.session.director
          .events.dailyBudget,
      cooldownCount:
        Object.keys(
          world.session.director
            .events
            .cooldownUntil
        ).length,
      proposalCount:
        Object.keys(
          world.session.director
            .proposals
        ).length,
    },
  };
}
