"use client";

import {
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import {
  getWorldState,
  subscribeWorldState,
} from "@/lib/world/state";

import {
  getMapInteractionState,
  beginChangingOrder,
  cancelChangingOrder,
  clearMapDestination,
  clearMapSelection,
  clearMapTarget,
  selectMapArmy,
  selectMapSettlement,
  subscribeMapInteraction,
} from "@/lib/ui/map-interaction";

import {
  buildArmyRoutePreview,
  formatDuration,
} from "@/lib/map/route-preview";

import {
  getArmySoldierCount,
  getArmyUnits,
} from "@/lib/military/army-queries";

import {
  getRealmControlLabel,
} from "@/lib/demo/realm-control";

import {
  cancelPlayerOrder,
  changeQueuedPlayerArmyOrder,
  issuePlayerArmyMove,
  issuePlayerInterception,
  recruitPlayerUnits,
} from "@/lib/session/player-actions";


import {
  assignPlayerArmyCommander,
  capturePlayerSettlement,
  developPlayerSettlement,
  fortifyPlayerSettlement,
  mergePlayerArmies,
  raidPlayerSettlement,
  splitPlayerArmy,
  stopPlayerArmySupport,
  supportPlayerArmy,
} from "@/lib/session/management-player-actions";

import {
  forcePlayerArmyBorderMove,
} from "@/lib/session/border-player-actions";

import {
  getPlayerKnownEnemyForces,
} from "@/lib/session/observation";

import {
  getPlayerOrders,
} from "@/lib/session/orders";


import {
  playerControlsArmy,
} from "@/lib/session/players";

import {
  getMapNode,
} from "@/lib/map/graph";

import {
  formatTerrainName,
  getStrategicNodeLabel,
} from "@/lib/map/strategic-nodes";

import type {
  UnitType,
} from "@/types/military";

function unitCount(
  armyId: string,
  type:
    "infantry" |
    "cavalry" |
    "siege"
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
      (total, unit) =>
        total +
        unit.currentSoldiers,
      0
    );
}

/*
 * Short, static tactical read on a destination's terrain -- the actual
 * combat math (see lib/military/battle-tactics.ts) already gives a
 * defender real bonuses here (fewer casualties taken, more dealt, holds
 * position); this just surfaces that as a plain-language hint at the
 * moment a player is picking where to move an army, so terrain-based
 * positioning is something they can deliberately choose to do.
 */
function terrainTacticalHint(
  terrain:
    string,
  features:
    string[]
): string {
  if (
    features.includes(
      "high_ground"
    )
  ) {
    return "High ground: a defending army here takes noticeably fewer casualties and hits harder.";
  }

  if (
    features.includes(
      "narrow_pass"
    )
  ) {
    return "Narrow pass: a chokepoint favors whoever holds it — attackers can't bring full numbers to bear.";
  }

  if (
    features.includes(
      "bridge"
    )
  ) {
    return "Bridge crossing: an attacking force here suffers a real power and casualty penalty. Strong ground to defend, costly to assault.";
  }

  if (
    terrain ===
    "hills"
  ) {
    return "Hills: a defending army here takes fewer casualties and fights more effectively.";
  }

  if (
    terrain ===
      "dense_forest" ||
    terrain ===
      "forest"
  ) {
    return "Forest: casualties are reduced for whoever holds the position.";
  }

  if (
    terrain ===
    "mountain"
  ) {
    return "Mountain terrain: difficult ground, favors a dug-in defender.";
  }

  if (
    terrain ===
    "marsh"
  ) {
    return "Marsh: slow, difficult ground for maneuver.";
  }

  return "Open ground: no particular terrain advantage for either side.";
}

export default function OperationalPanel() {
  const world =
    useSyncExternalStore(
      subscribeWorldState,
      getWorldState,
      getWorldState
    );

  const interaction =
    useSyncExternalStore(
      subscribeMapInteraction,
      getMapInteractionState,
      getMapInteractionState
    );

  const [message, setMessage] =
    useState<string | null>(
      null
    );

  const [borderConfirm, setBorderConfirm] =
    useState(false);

  const playerId =
    world.session
      .localPlayerId;

  const player =
    world.session.players[
      playerId
    ];

  const selectedArmy =
    interaction.selectedArmyId
      ? world.armies[
          interaction
            .selectedArmyId
        ]
      : undefined;

  const selectedSettlement =
    interaction
      .selectedSettlementId
      ? world.settlements[
          interaction
            .selectedSettlementId
        ]
      : undefined;

  const destinationSettlement =
    interaction
      .destinationSettlementId
      ? world.settlements[
          interaction
            .destinationSettlementId
        ]
      : undefined;

  const destinationNode =
    interaction
      .destinationNodeId
      ? getMapNode(
          interaction
            .destinationNodeId
        )
      : undefined;

  const selectedStrategicNode =
    interaction
      .selectedStrategicNodeId
      ? getMapNode(
          interaction
            .selectedStrategicNodeId
        )
      : undefined;

  const routePreview =
    selectedArmy &&
    interaction
      .destinationNodeId
      ? buildArmyRoutePreview(
          selectedArmy.id,
          interaction
            .destinationNodeId
        )
      : null;

  const isIndependentLordArmy =
    selectedArmy
      ? Object.values(
          world.session.lords
            .profiles
        ).some(
          (profile) =>
            profile
              .controlledArmyIds
              .includes(
                selectedArmy.id
              )
        )
      : false;

  const canPlayerOrderSelectedArmy =
    Boolean(
      selectedArmy &&
      player &&
      selectedArmy.ownerId ===
        player.kingdomId &&
      !isIndependentLordArmy
    );

  const armyMovement =
    selectedArmy
      ? world.simulation
          .activeMovements[
            selectedArmy.id
          ]
      : undefined;

  const lordProfile =
    selectedArmy
      ? Object.values(
          world.session.lords
            .profiles
        ).find(
          (profile) =>
            profile
              .controlledArmyIds
              .includes(
                selectedArmy.id
              )
        )
      : undefined;

  const commander =
    selectedArmy
      ?.commanderId
      ? world.characters[
          selectedArmy
            .commanderId
        ]
      : undefined;

  const armyPresenceContext =
    selectedArmy
      ? Object.values(
          world.session
            .presenceContexts
        ).find(
          (context) =>
            context.active &&
            context.kind ===
              "army" &&
            context.referenceId ===
              selectedArmy.id
        )
      : undefined;

  const charactersInArmy =
    armyPresenceContext
      ? armyPresenceContext
          .characterIds
          .map(
            (characterId) =>
              world.characters[
                characterId
              ]
          )
          .filter(Boolean)
      : commander
        ? [commander]
        : [];

  const controlLabel =
    selectedArmy
      ? isIndependentLordArmy
        ? "GM CHARACTER · LORD"
        : getRealmControlLabel(
            selectedArmy.ownerId
          )
      : undefined;

  const soldierCount =
    selectedArmy
      ? getArmySoldierCount(
          selectedArmy.id
        )
      : 0;

  const sizeLabel =
    soldierCount >= 5000
      ? "GREAT HOST"
      : soldierCount >= 2500
        ? "FIELD ARMY"
        : soldierCount >= 1000
          ? "HOST"
          : soldierCount >= 500
            ? "HOUSEHOLD FORCE"
            : "DETACHMENT";

  const settlementLord =
    selectedSettlement
      ? Object.values(
          world.session.lords
            .profiles
        ).find(
          (profile) =>
            profile
              .controlledSettlementIds
              .includes(
                selectedSettlement.id
              )
        )
      : undefined;

  const settlementLordCharacter =
    settlementLord
      ? world.characters[
          settlementLord
            .characterId
        ]
      : undefined;

  const selectedSettlementName =
    selectedSettlement
      ? world.locations[
          selectedSettlement
            .locationId
        ]?.name ??
        selectedSettlement.id
      : undefined;


  const playerOrders =
    getPlayerOrders(
      playerId
    );

  const activeArmyOrder =
    selectedArmy
      ? [...playerOrders]
          .reverse()
          .find(
            (order) =>
              (
                order.status ===
                  "queued" ||
                order.status ===
                  "executing"
              ) &&
              "armyId" in
                order.payload &&
              order.payload
                .armyId ===
                selectedArmy.id
          )
      : undefined;

  const enemyView =
    getPlayerKnownEnemyForces(
      world.session.id,
      playerId
    );

  const targetedEnemyFact =
    interaction
      .targetArmyId &&
    enemyView.ok
      ? [...enemyView.forces]
          .filter(
            (fact) =>
              fact.subjectId ===
              interaction
                .targetArmyId
          )
          .sort(
            (a, b) =>
              b.observedAt -
                a.observedAt ||
              b.deliveredAt -
                a.deliveredAt
          )[0]
      : undefined;

  const selectedSettlementRecruitment =
    selectedSettlement
      ? Object.values(
          world.recruitmentOrders
        )
          .filter(
            (order) =>
              order
                .settlementId ===
              selectedSettlement.id
          )
          .sort(
            (a, b) =>
              b.startedAt -
              a.startedAt
          )
      : [];


  const selectedSettlementOperations =
    selectedSettlement
      ? Object.values(
          world.settlementOperations
        )
          .filter(
            (operation) =>
              operation
                .settlementId ===
              selectedSettlement.id
          )
          .sort(
            (a, b) =>
              b.startedAt -
              a.startedAt
          )
      : [];

  const localSettlementArmies =
    selectedSettlement
      ? Object.values(
          world.armies
        ).filter(
          (army) => {
            if (
              army.status ===
              "destroyed"
            ) {
              return false;
            }

            const position =
              world.simulation
                .entityPositions[
                  army.id
                ];

            return (
              position?.kind ===
                "node" &&
              position.nodeId ===
                selectedSettlement
                  .locationId
            );
          }
        )
      : [];

  const selectedArmyAtSettlementPosition =
    selectedArmy
      ? world.simulation
          .entityPositions[
            selectedArmy.id
          ]
      : undefined;

  const selectedArmyAtSettlement =
    selectedArmy &&
    selectedSettlement &&
    selectedArmyAtSettlementPosition?.kind ===
      "node" &&
    selectedArmyAtSettlementPosition.nodeId ===
      selectedSettlement.locationId
      ? selectedArmy
      : undefined;

  const ownSettlement =
    Boolean(
      selectedSettlement &&
      player &&
      selectedSettlement
        .kingdomId ===
        player.kingdomId
    );


  const selectedArmyUnits =
    selectedArmy
      ? getArmyUnits(
          selectedArmy.id
        )
      : [];

  const rulerCharacter =
    player
      ? world.characters[
          player.characterId
        ]
      : undefined;

  const rulerPosition =
    rulerCharacter
      ? world.simulation
          .entityPositions[
            rulerCharacter.id
          ]
      : undefined;

  const selectedArmyPosition =
    selectedArmy
      ? world.simulation
          .entityPositions[
            selectedArmy.id
          ]
      : undefined;

  const rulerCanAssumeCommand =
    Boolean(
      rulerCharacter &&
      selectedArmyPosition &&
      rulerPosition &&
      selectedArmyPosition.kind ===
        "node" &&
      rulerPosition.kind ===
        "node" &&
      selectedArmyPosition.nodeId ===
        rulerPosition.nodeId &&
      selectedArmy
        ?.commanderId !==
        rulerCharacter.id
    );

  const assignableLordCommanders =
    selectedArmy &&
    player &&
    selectedArmyPosition?.kind ===
      "node"
      ? Object.values(
          world.session.lords
            .profiles
        ).filter(
          (profile) => {
            if (
              profile.kingdomId !==
              player.kingdomId
            ) {
              return false;
            }

            if (
              profile.characterId ===
              selectedArmy.commanderId
            ) {
              return false;
            }

            const lordPosition =
              world.simulation
                .entityPositions[
                  profile
                    .characterId
                ];

            return (
              lordPosition?.kind ===
                "node" &&
              lordPosition.nodeId ===
                selectedArmyPosition.nodeId
            );
          }
        )
      : [];

  const friendlyPeerArmies =
    selectedArmy &&
    player
      ? Object.values(
          world.armies
        ).filter(
          (army) =>
            army.id !==
              selectedArmy.id &&
            army.ownerId ===
              player.kingdomId &&
            army.status !==
              "destroyed" &&
            playerControlsArmy(
              playerId,
              army.id
            )
        )
      : [];

  const armyPower =
    useMemo(
      () => {
        if (!selectedArmy) {
          return 0;
        }

        return Math.round(
          unitCount(
            selectedArmy.id,
            "infantry"
          ) *
            1 +
            unitCount(
              selectedArmy.id,
              "cavalry"
            ) *
              1.4 +
            unitCount(
              selectedArmy.id,
              "siege"
            ) *
              55
        );
      },
      [
        selectedArmy,
      ]
    );

  function closeInspector(): void {
    clearMapSelection();
    setBorderConfirm(false);
    setMessage(null);
  }

  function cancelCurrentOrder(): void {
    if (!activeArmyOrder) {
      return;
    }

    const result =
      cancelPlayerOrder(
        world.session.id,
        playerId,
        activeArmyOrder.id
      );

    if (result.ok === false) {
      setMessage(
        `CANCEL REJECTED — ${result.error}`
      );
      return;
    }

    setMessage(
      `ORDER CANCELLED — ${activeArmyOrder.id}`
    );

    clearMapDestination();
  }

  function beginChangeCurrentOrder(): void {
    if (
      !activeArmyOrder ||
      activeArmyOrder.status !==
        "queued"
    ) {
      setMessage(
        "Only queued movement orders can change destination."
      );
      return;
    }

    beginChangingOrder(
      activeArmyOrder.id
    );

    setMessage(
      "CHANGE DESTINATION — click a settlement or strategic position, then confirm."
    );
  }

  function interceptTarget(): void {
    if (
      !selectedArmy ||
      !interaction.targetArmyId
    ) {
      return;
    }

    const result =
      issuePlayerInterception(
        world.session.id,
        playerId,
        selectedArmy.id,
        interaction.targetArmyId
      );

    if (result.ok === false) {
      setMessage(
        `INTERCEPT REJECTED — ${result.error}`
      );
      return;
    }

    setMessage(
      `INTERCEPT ORDER CREATED — ${selectedArmy.id} → known target ${interaction.targetArmyId}`
    );

    clearMapTarget();
  }

  function recruit(
    unitType:
      UnitType
  ): void {
    if (!selectedSettlement) {
      return;
    }

    const result =
      recruitPlayerUnits(
        world.session.id,
        playerId,
        selectedSettlement.id,
        unitType,
        1
      );

    if (result.ok === false) {
      setMessage(
        `RECRUITMENT REJECTED — ${result.error}`
      );
      return;
    }

    setMessage(
      `RECRUITMENT STARTED — ${unitType.toUpperCase()} at ${selectedSettlement.name} (cost ${result.order.reservedResources.gold.toLocaleString()}g)`
    );
  }

  if (
    !selectedArmy &&
    !selectedSettlement &&
    !selectedStrategicNode
  ) {
    return null;
  }

  function splitOneUnitBlock(
    unitId:
      string
  ): void {
    if (!selectedArmy) {
      return;
    }

    const result =
      splitPlayerArmy(
        world.session.id,
        playerId,
        selectedArmy.id,
        [
          unitId,
        ]
      );

    if (
      result.ok ===
      false
    ) {
      setMessage(
        `SPLIT REJECTED — ${result.error}`
      );
      return;
    }

    setMessage(
      `ARMY SPLIT — new force ${result.newArmyId}`
    );
  }

  function mergeFriendlyArmy(
    sourceArmyId:
      string
  ): void {
    if (!selectedArmy) {
      return;
    }

    const result =
      mergePlayerArmies(
        world.session.id,
        playerId,
        selectedArmy.id,
        sourceArmyId
      );

    if (
      result.ok ===
      false
    ) {
      setMessage(
        `MERGE REJECTED — ${result.error}`
      );
      return;
    }

    setMessage(
      `ARMIES MERGED — ${sourceArmyId} joined ${selectedArmy.id}`
    );
  }

  function supportFriendlyArmy(
    targetArmyId:
      string
  ): void {
    if (!selectedArmy) {
      return;
    }

    const result =
      supportPlayerArmy(
        world.session.id,
        playerId,
        selectedArmy.id,
        targetArmyId
      );

    if (
      result.ok ===
      false
    ) {
      setMessage(
        `SUPPORT REJECTED — ${result.error}`
      );
      return;
    }

    setMessage(
      `SUPPORT ASSIGNED — ${selectedArmy.id} → ${targetArmyId}`
    );
  }

  function stopSupport():
    void {
    if (!selectedArmy) {
      return;
    }

    const result =
      stopPlayerArmySupport(
        world.session.id,
        playerId,
        selectedArmy.id
      );

    if (
      result.ok ===
      false
    ) {
      setMessage(
        `SUPPORT CLEAR REJECTED — ${result.error}`
      );
      return;
    }

    setMessage(
      `SUPPORT CLEARED — ${selectedArmy.id}`
    );
  }

  function assumeCommand():
    void {
    if (
      !selectedArmy ||
      !rulerCharacter
    ) {
      return;
    }

    const result =
      assignPlayerArmyCommander(
        world.session.id,
        playerId,
        selectedArmy.id,
        rulerCharacter.id
      );

    if (
      result.ok ===
      false
    ) {
      setMessage(
        `COMMANDER ASSIGNMENT REJECTED — ${result.error}`
      );
      return;
    }

    setMessage(
      `COMMANDER ASSIGNED — ${rulerCharacter.name}`
    );
  }

  function assignLordCommand(
    characterId:
      string,
    lordName:
      string
  ): void {
    if (!selectedArmy) {
      return;
    }

    const result =
      assignPlayerArmyCommander(
        world.session.id,
        playerId,
        selectedArmy.id,
        characterId
      );

    if (
      result.ok ===
      false
    ) {
      setMessage(
        `COMMANDER ASSIGNMENT REJECTED — ${result.error}`
      );
      return;
    }

    setMessage(
      `COMMANDER ASSIGNED — ${lordName}`
    );
  }

  function developSelectedSettlement(
    focus:
      "food" |
      "gold" |
      "wood" |
      "stone" |
      "metal"
  ): void {
    if (!selectedSettlement) {
      return;
    }

    const result =
      developPlayerSettlement(
        world.session.id,
        playerId,
        selectedSettlement.id,
        focus
      );

    if (
      result.ok ===
      false
    ) {
      setMessage(
        `DEVELOPMENT REJECTED — ${result.error}`
      );
      return;
    }

    setMessage(
      `DEVELOPMENT COMPLETE — ${focus.toUpperCase()} +${result.productionGain}/day · level ${result.toLevel}`
    );
  }

  function raidSelectedSettlement():
    void {
    if (
      !selectedArmyAtSettlement ||
      !selectedSettlement
    ) {
      return;
    }

    const result =
      raidPlayerSettlement(
        world.session.id,
        playerId,
        selectedArmyAtSettlement.id,
        selectedSettlement.id
      );

    if (
      result.ok ===
      false
    ) {
      setMessage(
        `RAID REJECTED — ${result.error}`
      );
      return;
    }

    setMessage(
      `RAID STARTED — completes minute ${result.operation.completesAt}`
    );
  }

  function captureSelectedSettlement():
    void {
    if (
      !selectedArmyAtSettlement ||
      !selectedSettlement
    ) {
      return;
    }

    const result =
      capturePlayerSettlement(
        world.session.id,
        playerId,
        selectedArmyAtSettlement.id,
        selectedSettlement.id
      );

    if (
      result.ok ===
      false
    ) {
      setMessage(
        `CAPTURE REJECTED — ${result.error}`
      );
      return;
    }

    setMessage(
      `SETTLEMENT OCCUPIED — ${selectedSettlement.name}`
    );
  }

  function fortifySelectedSettlement():
    void {
    if (!selectedSettlement) {
      return;
    }

    const result =
      fortifyPlayerSettlement(
        world.session.id,
        playerId,
        selectedSettlement.id
      );

    if (
      result.ok ===
      false
    ) {
      setMessage(
        `FORTIFICATION REJECTED — ${result.error}`
      );
      return;
    }

    setMessage(
      `FORTIFICATION STARTED — level ${result.order.fromLevel} → ${result.order.toLevel}`
    );
  }

  function confirmMove(
    forceBorder:
      boolean
  ): void {
    if (
      !selectedArmy ||
      !interaction
        .destinationNodeId
    ) {
      return;
    }

    if (
      interaction
        .changingOrderId
    ) {
      const result =
        changeQueuedPlayerArmyOrder(
          world.session.id,
          playerId,
          interaction
            .changingOrderId,
          interaction
            .destinationNodeId
        );

      if (
        result.ok ===
        false
      ) {
        setMessage(
          `CHANGE REJECTED — ${result.error}`
        );
        return;
      }

      setMessage(
        `DESTINATION CHANGED — ${selectedArmy.id} → ${interaction.destinationNodeId}`
      );

      cancelChangingOrder();
      clearMapDestination();
      return;
    }

    const result =
      forceBorder
        ? forcePlayerArmyBorderMove(
            world.session.id,
            playerId,
            selectedArmy.id,
            interaction
              .destinationNodeId
          )
        : issuePlayerArmyMove(
            world.session.id,
            playerId,
            selectedArmy.id,
            interaction
              .destinationNodeId
          );

    if (
      result.ok ===
      false
    ) {
      if (
        result.error ===
        "BORDER_ACCESS_REQUIRED"
      ) {
        setBorderConfirm(
          true
        );

        setMessage(
          `Military access is not granted. Entering ${result.border?.toKingdomId ?? "foreign territory"} will create a border violation when the army physically crosses.`
        );

        return;
      }

      setMessage(
        `ACTION REJECTED — ${result.error}`
      );

      return;
    }

    setBorderConfirm(
      false
    );

    setMessage(
      `ORDER CREATED — ${selectedArmy.id} → ${interaction.destinationNodeId}`
    );

    clearMapDestination();
  }

  return (
    <aside className="fixed bottom-4 right-4 top-[88px] z-[90] w-[360px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-neutral-700/80 bg-[#0b0d0f]/96 p-4 text-neutral-100 shadow-[0_24px_80px_rgba(0,0,0,0.7)] backdrop-blur-xl">
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-neutral-800 pb-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400">
            {selectedArmy
              ? "Army Inspector"
              : selectedSettlement
                ? "Settlement Inspector"
                : "Strategic Position"}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            {selectedArmy
              ? "Choose a settlement, strategic position, or known enemy."
              : selectedSettlement
                ? "Manage local recruitment and inspect the settlement."
                : "Terrain and position details."}
          </div>
        </div>

        <button
          type="button"
          onClick={closeInspector}
          className="shrink-0 rounded-lg border border-neutral-700 bg-neutral-950/80 px-2.5 py-1.5 text-xs text-neutral-300 hover:border-neutral-500 hover:text-white"
          aria-label="Close inspector"
        >
          ✕
        </button>
      </div>

      {message ? (
        <div className="mb-4 rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-xs leading-5 text-neutral-300">
          {message}
        </div>
      ) : null}

      {selectedArmy ? (
        <section>
          <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
            Selected Army
          </div>

          <h2 className="mt-1 text-lg font-semibold">
            {commander?.name
              ? `${commander.name}'s Host`
              : selectedArmy.id}
          </h2>

          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-[10px] font-semibold">
              {sizeLabel}
            </span>

            <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
              controlLabel === "ACTOR LLM"
                ? "border-cyan-700 bg-cyan-950/40 text-cyan-200"
                : controlLabel?.startsWith("GM")
                  ? "border-violet-700 bg-violet-950/40 text-violet-200"
                  : "border-amber-700 bg-amber-950/40 text-amber-200"
            }`}>
              {controlLabel}
            </span>
          </div>

          {lordProfile ? (
            <div className="mt-2 text-xs text-violet-300">
              Household army of {
                lordProfile.title
              }
            </div>
          ) : (
            <div className="mt-2 text-xs text-amber-300">
              Realm / royal field army
            </div>
          )}

          {targetedEnemyFact ? (
            <div className="mt-4 rounded-xl border border-red-800/70 bg-red-950/25 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-red-300">
                Known Enemy Target
              </div>

              <div className="mt-2 text-sm font-semibold">
                {targetedEnemyFact.subjectId}
              </div>

              <div className="mt-2 text-xs leading-5 text-neutral-300">
                {targetedEnemyFact.summary}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-y-1 text-[11px]">
                <span className="text-neutral-500">
                  Confidence
                </span>
                <span className="uppercase">
                  {targetedEnemyFact.confidence}
                </span>

                <span className="text-neutral-500">
                  Last observed
                </span>
                <span>
                  {Math.max(
                    0,
                    world.simulation.worldTimeMinutes -
                      targetedEnemyFact.observedAt
                  )} min ago
                </span>
              </div>

              {canPlayerOrderSelectedArmy ? (
                <button
                  type="button"
                  onClick={interceptTarget}
                  className="mt-3 w-full rounded-lg border border-red-700 bg-red-900/40 px-3 py-2 text-xs font-semibold text-red-100 hover:bg-red-900/65"
                >
                  INTERCEPT KNOWN POSITION
                </button>
              ) : null}

              <button
                type="button"
                onClick={clearMapTarget}
                className="mt-2 w-full rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-300"
              >
                CANCEL TARGET
              </button>
            </div>
          ) : null}

          {activeArmyOrder ? (
            <div className="mt-4 rounded-xl border border-cyan-900/70 bg-cyan-950/20 p-3 text-xs">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                Current Order
              </div>

              <div className="mt-2 font-semibold uppercase">
                {activeArmyOrder.type.replaceAll("_", " ")}
              </div>

              <div className="mt-1 text-neutral-400">
                Status: {activeArmyOrder.status}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={cancelCurrentOrder}
                  className="rounded-lg border border-red-800 px-2 py-2 text-red-200 hover:bg-red-950/40"
                >
                  CANCEL ORDER
                </button>

                <button
                  type="button"
                  onClick={beginChangeCurrentOrder}
                  disabled={
                    activeArmyOrder.status !== "queued" ||
                    activeArmyOrder.type !== "move_army"
                  }
                  className="rounded-lg border border-neutral-700 px-2 py-2 text-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  CHANGE DESTINATION
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-neutral-900 p-3">
              <div className="text-neutral-500">
                Soldiers
              </div>
              <div className="mt-1 text-lg font-semibold">
                {getArmySoldierCount(
                  selectedArmy.id
                ).toLocaleString()}
              </div>
            </div>

            <div className="rounded-lg bg-neutral-900 p-3">
              <div className="text-neutral-500">
                Power
              </div>
              <div className="mt-1 text-lg font-semibold">
                {armyPower.toLocaleString()}
              </div>
            </div>

            <div className="rounded-lg bg-neutral-900 p-3">
              <div className="text-neutral-500">
                Morale
              </div>
              <div className="mt-1 uppercase">
                {selectedArmy.morale}
              </div>
            </div>

            <div className="rounded-lg bg-neutral-900 p-3">
              <div className="text-neutral-500">
                Supply
              </div>
              <div className="mt-1 uppercase">
                {selectedArmy.supply.state}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 text-xs">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Command & Characters
            </div>

            <div className="space-y-2">
              {charactersInArmy.length > 0 ? (
                charactersInArmy.map((character) => (
                  <div
                    key={character.id}
                    className="flex items-center justify-between rounded bg-neutral-950/70 px-2 py-2"
                  >
                    <span>
                      {character.rank === "lord" ? "♜ " : "♔ "}
                      {character.name}
                    </span>
                    <span className="text-[10px] uppercase text-neutral-500">
                      {character.id === selectedArmy.commanderId
                        ? "Commander"
                        : "With army"}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-neutral-500">
                  No explicitly attached character presence.
                </div>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-y-2 border-t border-neutral-800 pt-3">
              <span className="text-neutral-500">
                Infantry
              </span>
              <span>
                {unitCount(
                  selectedArmy.id,
                  "infantry"
                ).toLocaleString()}
              </span>

              <span className="text-neutral-500">
                Cavalry
              </span>
              <span>
                {unitCount(
                  selectedArmy.id,
                  "cavalry"
                ).toLocaleString()}
              </span>

              <span className="text-neutral-500">
                Siege
              </span>
              <span>
                {unitCount(
                  selectedArmy.id,
                  "siege"
                ).toLocaleString()}
              </span>
            </div>
          </div>

          {armyMovement ? (
            <div className="mt-3 rounded-lg border border-cyan-900 bg-cyan-950/25 p-3 text-xs">
              <div className="font-semibold text-cyan-200">
                MARCHING
              </div>
              <div className="mt-1 text-neutral-400">
                Destination: {
                  armyMovement.destinationNodeId
                }
              </div>
              <div className="mt-1 text-neutral-500">
                ETA minute {
                  Math.ceil(
                    armyMovement
                      .estimatedArrivalAt
                  )
                }
              </div>
            </div>
          ) : null}

          {isIndependentLordArmy ? (
            <div className="mt-4 rounded-lg border border-violet-900 bg-violet-950/20 p-3 text-xs leading-5 text-violet-200">
              This force belongs to an independent major lord. The ruler cannot directly puppet it. Use a character order; the GM Character decides compliance.
            </div>
          ) : null}

          {canPlayerOrderSelectedArmy ? (
            <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/55 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">
                Army Organization
              </div>

              <div className="mt-2 text-[11px] leading-5 text-neutral-400">
                Split/merge/support are physical operations. Moving or engaged forces are rejected by the canonical engine.
              </div>

              <div className="mt-3 space-y-2">
                {selectedArmyUnits.slice(0, 6).map(
                  (unit) => (
                    <div
                      key={unit.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-black/25 px-2 py-2 text-xs"
                    >
                      <span>
                        {unit.type.toUpperCase()} · {unit.currentSoldiers.toLocaleString()}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          splitOneUnitBlock(
                            unit.id
                          )
                        }
                        disabled={
                          selectedArmyUnits.length <= 1
                        }
                        className="rounded border border-neutral-700 px-2 py-1 text-[10px] text-neutral-200 disabled:opacity-35"
                      >
                        DETACH
                      </button>
                    </div>
                  )
                )}
              </div>

              {selectedArmy.supportTargetArmyId ? (
                <div className="mt-3 rounded-lg border border-violet-800/70 bg-violet-950/25 p-2 text-xs">
                  <div className="text-violet-300">
                    SUPPORTING
                  </div>

                  <div className="mt-1">
                    {selectedArmy.supportTargetArmyId}
                  </div>

                  <button
                    type="button"
                    onClick={stopSupport}
                    className="mt-2 rounded border border-violet-800 px-2 py-1 text-[10px] text-violet-100"
                  >
                    STOP SUPPORT
                  </button>
                </div>
              ) : null}

              {friendlyPeerArmies.length > 0 ? (
                <div className="mt-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    Friendly Forces
                  </div>

                  <div className="mt-2 space-y-2">
                    {friendlyPeerArmies
                      .slice(0, 6)
                      .map((army) => (
                        <div
                          key={army.id}
                          className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-2"
                        >
                          <div className="text-xs font-semibold">
                            {army.id}
                          </div>

                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                supportFriendlyArmy(
                                  army.id
                                )
                              }
                              className="rounded border border-cyan-900 px-2 py-1 text-[10px] text-cyan-200"
                            >
                              SUPPORT
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                mergeFriendlyArmy(
                                  army.id
                                )
                              }
                              className="rounded border border-neutral-700 px-2 py-1 text-[10px] text-neutral-200"
                            >
                              MERGE
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-950/50 p-2 text-xs">
                <div className="text-[10px] uppercase tracking-wider text-neutral-500">
                  Commander
                </div>

                <div className="mt-1">
                  {commander?.name ??
                    selectedArmy.commanderId ??
                    "No named commander"}
                </div>

                {rulerCanAssumeCommand ? (
                  <button
                    type="button"
                    onClick={assumeCommand}
                    className="mt-2 w-full rounded border border-amber-700 bg-amber-950/25 px-2 py-2 text-[10px] font-semibold text-amber-200"
                  >
                    RULER ASSUMES COMMAND
                  </button>
                ) : null}

                {assignableLordCommanders.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-neutral-500">
                      Appoint Lord
                    </div>

                    {assignableLordCommanders
                      .slice(0, 4)
                      .map((profile) => {
                        const lordCharacter =
                          world.characters[
                            profile
                              .characterId
                          ];

                        const lordName =
                          lordCharacter?.name ??
                          profile.title;

                        return (
                          <button
                            key={
                              profile.characterId
                            }
                            type="button"
                            onClick={() =>
                              assignLordCommand(
                                profile.characterId,
                                lordName
                              )
                            }
                            className="flex w-full items-center justify-between rounded border border-violet-800/70 bg-violet-950/20 px-2 py-2 text-[10px] font-semibold text-violet-200"
                          >
                            <span>
                              {lordName}
                            </span>

                            <span className="text-violet-400">
                              loyalty {profile.loyalty}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {routePreview?.ok ? (
            <div className="mt-4 rounded-xl border border-yellow-800/60 bg-yellow-950/15 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-yellow-300">
                Route Preview
              </div>

              <div className="mt-2 text-sm font-semibold">
                → {
                  destinationSettlement
                    ?.name ??
                  (
                    destinationNode
                      ? getStrategicNodeLabel(
                          destinationNode
                        )
                      : routePreview
                          .preview
                          .destinationName
                  )
                }
              </div>

              {routePreview.preview.destinationTerrain ? (
                <div className="mt-2 rounded-lg border border-emerald-900/60 bg-emerald-950/20 px-2 py-2 text-[11px] leading-5 text-emerald-200">
                  <span className="font-semibold uppercase tracking-wide">
                    Terrain: {
                      routePreview
                        .preview
                        .destinationTerrain
                        .replaceAll(
                          "_",
                          " "
                        )
                    }
                    {
                      routePreview
                        .preview
                        .destinationFeatures
                        .length >
                      0
                        ? ` · ${routePreview.preview.destinationFeatures.join(", ").replaceAll("_", " ")}`
                        : ""
                    }
                  </span>
                  <div className="mt-1 text-emerald-300/80">
                    {
                      terrainTacticalHint(
                        routePreview
                          .preview
                          .destinationTerrain,
                        routePreview
                          .preview
                          .destinationFeatures
                      )
                    }
                  </div>
                </div>
              ) : null}

              <div className="mt-3 grid grid-cols-2 gap-y-2 text-xs">
                <span className="text-neutral-500">
                  Distance
                </span>
                <span>
                  {
                    routePreview
                      .preview
                      .physicalDistanceKm
                  } km
                </span>

                <span className="text-neutral-500">
                  Effective
                </span>
                <span>
                  {
                    routePreview
                      .preview
                      .effectiveDistanceKm
                      .toFixed(0)
                  } km
                </span>

                <span className="text-neutral-500">
                  ETA
                </span>
                <span>
                  {formatDuration(
                    routePreview
                      .preview
                      .estimatedDurationMinutes
                  )}
                </span>

                <span className="text-neutral-500">
                  Road legs
                </span>
                <span>
                  {
                    routePreview
                      .preview
                      .edgeIds
                      .length
                  }
                </span>
              </div>

              {routePreview
                .preview
                .unauthorizedBorder ? (
                <div className="mt-3 rounded-lg border border-red-800 bg-red-950/35 p-3 text-xs leading-5 text-red-200">
                  ⚠ Foreign border ahead: {
                    routePreview
                      .preview
                      .unauthorizedBorder
                      .fromKingdomId
                  } → {
                    routePreview
                      .preview
                      .unauthorizedBorder
                      .toKingdomId
                  }. Military access is not currently recognized.
                </div>
              ) : null}

              {canPlayerOrderSelectedArmy ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearMapDestination();
                      setBorderConfirm(false);
                    }}
                    className="rounded-lg border border-neutral-700 px-3 py-2 text-xs"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      confirmMove(false)
                    }
                    className="rounded-lg bg-yellow-400 px-3 py-2 text-xs font-semibold text-black"
                  >
                    Confirm Move
                  </button>
                </div>
              ) : null}

              {borderConfirm &&
              canPlayerOrderSelectedArmy ? (
                <div className="mt-3 rounded-xl border border-red-700 bg-red-950/45 p-3">
                  <div className="text-xs font-semibold text-red-200">
                    BORDER VIOLATION
                  </div>
                  <p className="mt-1 text-xs leading-5 text-red-300/80">
                    The army will physically march toward the frontier. The diplomatic incident occurs only if it actually crosses the foreign border edge.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setBorderConfirm(false)
                      }
                      className="rounded border border-neutral-700 px-2 py-2 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        confirmMove(true)
                      }
                      className="rounded bg-red-500 px-2 py-2 text-xs font-semibold text-white"
                    >
                      Cross Border
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : selectedSettlement ? (
        <section>
          <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
            {selectedSettlement.type.replaceAll("_", " ")}
          </div>

          <h2 className="mt-1 text-lg font-semibold">
            {selectedSettlementName}
          </h2>

          <div className="mt-3 grid grid-cols-2 gap-y-2 rounded-lg bg-neutral-900 p-3 text-xs">
            <span className="text-neutral-500">
              Owner
            </span>
            <span>
              {selectedSettlement.kingdomId}
            </span>

            <span className="text-neutral-500">
              Controller
            </span>
            <span>
              {selectedSettlement.controllerKingdomId ??
                selectedSettlement.kingdomId}
            </span>

            <span className="text-neutral-500">
              Fortification
            </span>
            <span>
              Level {selectedSettlement.fortificationLevel ?? 0}
            </span>
          </div>

          <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Local Resources
            </div>

            <div className="mt-2 grid grid-cols-2 gap-y-1 text-xs">
              {Object.entries(
                selectedSettlement.resources
              ).map(([key, value]) => (
                <span key={key} className="contents">
                  <span className="text-neutral-500">
                    {key.toUpperCase()}
                  </span>
                  <span>
                    {value.toLocaleString()}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {ownSettlement ? (
            <div className="mt-4 rounded-xl border border-amber-900/60 bg-amber-950/15 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                Settlement Development
              </div>

              <div className="mt-2 text-xs text-neutral-400">
                Economic level {selectedSettlement.developmentLevel ?? 0}/3
                {selectedSettlement.developmentFocus
                  ? ` · last focus ${selectedSettlement.developmentFocus}`
                  : ""}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {(
                  [
                    "food",
                    "gold",
                    "wood",
                    "stone",
                    "metal",
                  ] as const
                ).map((focus) => (
                  <button
                    key={focus}
                    type="button"
                    onClick={() =>
                      developSelectedSettlement(
                        focus
                      )
                    }
                    disabled={
                      (selectedSettlement.developmentLevel ?? 0) >= 3
                    }
                    className="rounded-lg border border-neutral-700 bg-neutral-950/70 px-2 py-2 text-[10px] font-semibold uppercase text-neutral-200 hover:border-amber-600 disabled:opacity-35"
                  >
                    INVEST {focus}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={fortifySelectedSettlement}
                className="mt-3 w-full rounded-lg border border-amber-700 bg-amber-950/25 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-950/45"
              >
                FORTIFY SETTLEMENT
              </button>

              <div className="mt-4 border-t border-neutral-800 pt-3 text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                Recruitment
              </div>

              <div className="mt-2 text-xs leading-5 text-neutral-400">
                Recruitment is physical and local. Completed troops appear here as a garrison force; they are not teleported into a distant army.
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {(
                  [
                    "infantry",
                    "cavalry",
                    "siege",
                    "ship",
                  ] as UnitType[]
                ).map((unitType) => (
                  <button
                    key={unitType}
                    type="button"
                    onClick={() =>
                      recruit(
                        unitType
                      )
                    }
                    className="rounded-lg border border-neutral-700 bg-neutral-950/70 px-2 py-2 text-xs uppercase text-neutral-200 hover:border-amber-600"
                  >
                    + {unitType}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {localSettlementArmies.length > 0 ? (
            <div className="mt-4 rounded-lg border border-neutral-800 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Forces At Settlement
              </div>

              <div className="mt-2 space-y-2">
                {localSettlementArmies
                  .slice(0, 8)
                  .map((army) => (
                    <button
                      key={army.id}
                      type="button"
                      onClick={() =>
                        selectMapArmy(
                          army.id
                        )
                      }
                      className="flex w-full items-center justify-between rounded bg-neutral-950/70 p-2 text-left text-xs hover:bg-neutral-900"
                    >
                      <span>
                        {army.id}
                      </span>

                      <span className="uppercase text-neutral-500">
                        {army.status}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          ) : null}

          {!ownSettlement &&
          selectedArmyAtSettlement ? (
            <div className="mt-4 rounded-xl border border-red-900/70 bg-red-950/20 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-red-300">
                Hostile Settlement Actions
              </div>

              <div className="mt-2 text-xs leading-5 text-neutral-400">
                The selected army is physically present here. Wartime rules and fortifications are validated canonically.
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={raidSelectedSettlement}
                  className="rounded-lg border border-orange-800 bg-orange-950/25 px-2 py-2 text-xs font-semibold text-orange-100"
                >
                  RAID
                </button>

                <button
                  type="button"
                  onClick={captureSelectedSettlement}
                  className="rounded-lg border border-red-800 bg-red-950/30 px-2 py-2 text-xs font-semibold text-red-100"
                >
                  OCCUPY
                </button>
              </div>
            </div>
          ) : null}

          {selectedSettlementOperations.length > 0 ? (
            <div className="mt-4 rounded-lg border border-neutral-800 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Settlement Operations
              </div>

              <div className="mt-2 space-y-2">
                {selectedSettlementOperations
                  .slice(0, 6)
                  .map((operation) => (
                    <div
                      key={operation.id}
                      className="rounded bg-neutral-950/70 p-2 text-xs"
                    >
                      <div className="font-semibold uppercase">
                        {operation.type}
                      </div>

                      <div className="mt-1 text-neutral-500">
                        {operation.status} · completes minute {operation.completesAt}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}

          {selectedSettlementRecruitment.length > 0 ? (
            <div className="mt-4 rounded-lg border border-neutral-800 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Recruitment Orders
              </div>

              <div className="mt-2 space-y-2">
                {selectedSettlementRecruitment
                  .slice(0, 6)
                  .map((order) => (
                    <div
                      key={order.id}
                      className="rounded bg-neutral-950/70 p-2 text-xs"
                    >
                      <div className="font-semibold uppercase">
                        {order.unitType} × {order.blocks}
                      </div>
                      <div className="mt-1 text-neutral-500">
                        {order.status} · completes minute {order.completesAt}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : selectedStrategicNode ? (
        <section>
          <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
            Strategic Position
          </div>

          <h2 className="mt-1 text-lg font-semibold">
            {getStrategicNodeLabel(
              selectedStrategicNode
            )}
          </h2>

          <div className="mt-1 break-all text-[10px] text-neutral-600">
            {selectedStrategicNode.id}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-y-2 rounded-lg bg-neutral-900 p-3 text-xs">
            <span className="text-neutral-500">
              Terrain
            </span>
            <span>
              {formatTerrainName(
                selectedStrategicNode.terrain
              )}
            </span>

            <span className="text-neutral-500">
              Position
            </span>
            <span>
              {getStrategicNodeLabel(
                selectedStrategicNode
              )}
            </span>

            <span className="text-neutral-500">
              Territory
            </span>
            <span>
              {selectedStrategicNode.territoryKingdomId ??
                "Contested / border"}
            </span>
          </div>

          <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 text-xs">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              Battle Features
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {selectedStrategicNode.features.length > 0 ? (
                selectedStrategicNode.features.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full border border-neutral-700 px-2 py-1 text-[10px]"
                  >
                    {formatTerrainName(
                      feature
                    )}
                  </span>
                ))
              ) : (
                <span className="text-neutral-500">
                  No additional feature beyond terrain.
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 text-xs leading-5 text-neutral-400">
            This is a real canonical army destination. An army may move here, stop here, be contacted here, and fight using this node&apos;s terrain definition.
          </div>
        </section>
      ) : null}
    </aside>
  );
}
