"use client";

import {
  useSyncExternalStore,
} from "react";

import {
  getWorldState,
  subscribeWorldState,
} from "@/lib/world/state";

import {
  getMapInteractionState,
  subscribeMapInteraction,
} from "@/lib/ui/map-interaction";

import {
  getPlayerKnownEnemyForces,
} from "@/lib/session/observation";

function outlookClass(
  outlook: string
): string {
  switch (
    outlook
  ) {
    case "strong_advantage":
      return "text-emerald-200";
    case "advantage":
      return "text-green-200";
    case "disadvantage":
      return "text-orange-200";
    case "strong_disadvantage":
      return "text-red-200";
    default:
      return "text-neutral-200";
  }
}

function formatAge(
  minutes: number
): string {
  if (
    minutes <
    60
  ) {
    return `${Math.max(
      1,
      Math.round(
        minutes
      )
    )} minutes`;
  }

  if (
    minutes <
    24 *
      60
  ) {
    return `${Math.round(
      minutes /
        60
    )} hours`;
  }

  return `${Math.round(
    minutes /
      (
        24 *
        60
      )
  )} days`;
}

export default function WarIntelligencePanel({ embedded = false }: { embedded?: boolean } = {}) {
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

  const playerId =
    world.session
      .localPlayerId;

  const enemyView =
    getPlayerKnownEnemyForces(
      world.session.id,
      playerId,
      interaction
        .selectedArmyId ??
        undefined
    );

  if (
    !enemyView.ok
  ) {
    return null;
  }

  const selectedOwnArmy =
    interaction
      .selectedArmyId
      ? world.armies[
          interaction
            .selectedArmyId
        ]
      : undefined;

  const target =
    interaction
      .targetArmyId
      ? enemyView.forces
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

  if (
    !selectedOwnArmy &&
    !target
  ) {
    return null;
  }

  const estimate =
    target
      ?.battlefieldEstimate;

  return (
    <aside className={embedded ? "max-h-[62vh] w-full overflow-y-auto rounded-xl border border-red-900/60 bg-black/55 p-3 text-neutral-100" : "fixed bottom-4 left-4 z-[84] max-h-[72vh] w-[430px] overflow-y-auto rounded-xl border border-red-900/60 bg-black/88 p-3 text-neutral-100 shadow-2xl backdrop-blur"}>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-red-300">
        War Map Intelligence
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded bg-white/5 p-2">
          <div className="text-neutral-500">
            Selected Army
          </div>
          <div className="mt-1 font-semibold">
            {selectedOwnArmy
              ? selectedOwnArmy.id
              : "Select an army"}
          </div>
        </div>

        <div className="rounded bg-white/5 p-2">
          <div className="text-neutral-500">
            Enemy Target
          </div>
          <div className="mt-1 font-semibold">
            {target
              ? target.subjectId
              : "Select a known enemy ghost"}
          </div>
        </div>
      </div>

      {target ? (
        <div className="mt-2 rounded border border-red-900/40 bg-red-950/20 p-2 text-[10px]">
          <div className="flex justify-between gap-2">
            <span>
              Confidence
            </span>
            <span className="font-bold uppercase">
              {target.confidence}
            </span>
          </div>

          <div className="mt-1 flex justify-between gap-2">
            <span>
              Report age
            </span>
            <span>
              {formatAge(
                target.targeting
                  .ageMinutes
              )}
            </span>
          </div>

          <div className="mt-1 flex justify-between gap-2">
            <span>
              Estimated strength
            </span>
            <span>
              {typeof target.data
                .approximateSoldiers ===
              "number"
                ? `~${target.data.approximateSoldiers.toLocaleString()}`
                : "unknown"}
            </span>
          </div>

          <div className="mt-2 border-t border-white/10 pt-2 text-neutral-300">
            {target.targeting
              .reason}
          </div>
        </div>
      ) : null}

      {estimate ? (
        <>
          <div className="mt-2 rounded border border-amber-900/50 bg-amber-950/15 p-2 text-[10px]">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wide text-amber-200">
                Position Estimate
              </span>

              <span
                className={`font-black uppercase ${outlookClass(
                  estimate.outlook
                )}`}
              >
                {estimate.outlook.replaceAll(
                  "_",
                  " "
                )}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1">
              <div>
                Terrain
              </div>
              <div className="text-right font-semibold">
                {estimate
                  .battlefield
                  .terrain}
              </div>

              <div>
                Features
              </div>
              <div className="text-right">
                {estimate
                  .battlefield
                  .features
                  .length >
                0
                  ? estimate
                      .battlefield
                      .features
                      .join(", ")
                  : "none"}
              </div>

              <div>
                Frontage
              </div>
              <div className="text-right">
                {Math.round(
                  estimate
                    .battlefield
                    .frontageMultiplier *
                    100
                )}
                %
              </div>

              <div>
                Bridgehead
              </div>
              <div className="text-right">
                {estimate
                  .battlefield
                  .bridgehead
                  ? "YES"
                  : "no"}
              </div>

              <div>
                Chokepoint
              </div>
              <div className="text-right">
                {estimate
                  .battlefield
                  .chokepoint
                  ? "YES"
                  : "no"}
              </div>

              <div>
                Attack bias
              </div>
              <div className="text-right">
                ×
                {estimate
                  .battlefield
                  .attackerBias
                  .toFixed(2)}
              </div>

              <div>
                Approx. strength
              </div>
              <div className="text-right">
                {estimate
                  .approximateStrengthRatio
                  ? `${estimate.approximateStrengthRatio.toFixed(
                      2
                    )}:1`
                  : "unknown"}
              </div>
            </div>

            {estimate
              .ownFit
              .recommendedTactics[
                0
              ] ? (
              <div className="mt-2 rounded bg-black/35 p-2">
                <span className="text-neutral-500">
                  Best valid battle tactic:{" "}
                </span>
                <span className="font-bold text-amber-200">
                  {
                    estimate
                      .ownFit
                      .recommendedTactics[
                        0
                      ].tactic
                  }
                </span>
              </div>
            ) : null}
          </div>

          <div className="mt-2 rounded border border-cyan-900/50 bg-cyan-950/15 p-2 text-[10px]">
            <div className="font-bold uppercase tracking-wide text-cyan-200">
              Deployment Recommendations
            </div>

            <div className="mt-2 space-y-2">
              {estimate
                .deploymentRecommendations
                .slice(
                  0,
                  4
                )
                .map(
                  (
                    recommendation
                  ) => (
                    <div
                      key={`${recommendation.choice}-${recommendation.destinationNodeId ?? "here"}`}
                      className="rounded bg-black/30 p-2"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-bold text-cyan-100">
                          {recommendation.choice.replaceAll(
                            "_",
                            " "
                          )}
                        </span>

                        <span>
                          {recommendation.score.toFixed(
                            2
                          )}
                        </span>
                      </div>

                      <div className="mt-1 text-neutral-400">
                        {recommendation.reason}
                      </div>

                      {recommendation.destinationNodeId ? (
                        <div className="mt-1 text-cyan-300">
                          Suggested node:{" "}
                          {recommendation.destinationNodeId}
                        </div>
                      ) : null}
                    </div>
                  )
                )}
            </div>
          </div>

          {estimate
            .battlefield
            .adjacentAlternatives
            .length >
          0 ? (
            <details className="mt-2 rounded border border-white/10 bg-white/5 p-2 text-[10px]">
              <summary className="cursor-pointer font-bold text-neutral-200">
                Nearby battlefield alternatives
              </summary>

              <div className="mt-2 space-y-1">
                {estimate
                  .battlefield
                  .adjacentAlternatives
                  .slice(
                    0,
                    5
                  )
                  .map(
                    (
                      alternative
                    ) => (
                      <div
                        key={alternative.nodeId}
                        className="grid grid-cols-[1fr_auto] gap-2 rounded bg-black/25 p-1.5"
                      >
                        <div>
                          <div className="font-semibold">
                            {alternative.nodeId}
                          </div>
                          <div className="text-neutral-500">
                            {alternative.terrain} · {alternative.reason}
                          </div>
                        </div>

                        <div className="text-right text-neutral-400">
                          D {alternative.defenderScore.toFixed(
                            2
                          )}
                          <br />
                          A {alternative.attackerScore.toFixed(
                            2
                          )}
                        </div>
                      </div>
                    )
                  )}
              </div>
            </details>
          ) : null}

          <div className="mt-2 space-y-1 rounded bg-white/5 p-2 text-[10px] text-neutral-400">
            {estimate.reasons
              .slice(
                0,
                5
              )
              .map(
                (
                  reason,
                  index
                ) => (
                  <div
                    key={`${index}-${reason}`}
                  >
                    • {reason}
                  </div>
                )
              )}
          </div>
        </>
      ) : null}

      {target &&
      selectedOwnArmy &&
      !estimate ? (
        <div className="mt-2 rounded bg-white/5 p-2 text-[10px] text-neutral-400">
          No reliable battlefield estimate can be produced from the current intelligence.
        </div>
      ) : null}
    </aside>
  );
}
