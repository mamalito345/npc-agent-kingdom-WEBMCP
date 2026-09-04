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

import type {
  PersistentBattle,
} from "@/types/military";

/*
 * Cost control: every one of these arrays is resent, unfiltered, on
 * EVERY single GM/actor LLM activation (no diffing/caching), and a
 * single command window can reactivate the same player many times
 * (lib/actors/orchestrator.ts's 40-iteration catch-up guard) if it
 * never calls pass_command_window. 30 trailing entries per array,
 * across 5 kingdoms' worth of activity, was a real, unnecessary
 * multiplier on API cost with little strategic value past the last
 * handful of events -- an LLM planning THIS turn rarely needs the 25th
 * most recent message. Lowered from 30 to 8.
 */
const RECENT_MESSAGE_LIMIT =
  8;

const RECENT_EVENT_LIMIT =
  8;

const REALM_FACT_LIMIT =
  8;

const RECENT_LORD_ORDER_LIMIT =
  8;

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


const RECENT_ENDED_CONFLICT_LIMIT =
  3;

const RECENT_BATTLE_DETAIL_LIMIT =
  2;

/*
 * Every active item is kept (the GM/actor genuinely needs full detail
 * on what's happening right now); ended items are capped to the most
 * recent few by start time, dropping older resolved conflicts that
 * are no longer strategically relevant to THIS activation.
 */
function recentWithActiveFirst<
  T
>(
  items: T[],
  isActive: (
    item: T
  ) => boolean,
  startedAt: (
    item: T
  ) => number
): T[] {
  const active =
    items.filter(
      isActive
    );

  const ended =
    items
      .filter(
        (item) =>
          !isActive(
            item
          )
      )
      .sort(
        (a, b) =>
          startedAt(
            b
          ) -
          startedAt(
            a
          )
      )
      .slice(
        0,
        RECENT_ENDED_CONFLICT_LIMIT
      );

  return [
    ...active,
    ...ended,
  ];
}

/*
 * A PersistentBattle's `rounds` and `history` arrays grow one entry
 * per phase/round for the battle's entire duration -- the single
 * biggest per-item cost in the whole snapshot for a long or
 * multi-round fight. lastRound and pendingDecision (the fields a
 * crisis-order decision actually depends on) are untouched; only the
 * full historical tail is trimmed.
 */
function trimBattleDetail(
  battle: PersistentBattle
): PersistentBattle {
  const rounds =
    battle.rounds;

  const history =
    battle.history;

  return {
    ...battle,
    rounds:
      Array.isArray(
        rounds
      )
        ? rounds.slice(
            -RECENT_BATTLE_DETAIL_LIMIT
          )
        : rounds,
    history:
      Array.isArray(
        history
      )
        ? history.slice(
            -RECENT_BATTLE_DETAIL_LIMIT
          )
        : history,
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
          RECENT_LORD_ORDER_LIMIT
        ),

    /*
     * Cost control: wars/battles/sieges never got cleaned up or
     * bounded -- every war, battle and siege that ever happened in the
     * session stayed in world state forever and was resent in FULL
     * (including a PersistentBattle's entire round-by-round `rounds`
     * and `history` arrays) on every single GM/actor activation. An
     * active conflict still needs real detail to reason about; a
     * conflict that ended an hour of game-time ago mostly does not.
     * Active ones keep full detail; ended ones are capped to the most
     * recent few, with round-by-round detail trimmed to a short tail.
     */
    wars:
      recentWithActiveFirst(
        Object.values(
          world.wars
        ),
        (war) =>
          war.status ===
          "active",
        (war) =>
          war.startedAt
      ),

    battles:
      recentWithActiveFirst(
        Object.values(
          world.battles
        ),
        (battle) =>
          battle.status ===
          "active",
        (battle) =>
          battle.startedAt
      ).map(
        trimBattleDetail
      ),

    sieges:
      recentWithActiveFirst(
        Object.values(
          world.sieges
        ),
        (siege) =>
          siege.status ===
          "active",
        (siege) =>
          siege.startedAt
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
