"use client";

import {
  useState,
  useSyncExternalStore,
} from "react";

import {
  getWorldState,
  subscribeWorldState,
} from "@/lib/world/state";

import {
  humanInspectPresentCharacters,
} from "@/lib/conversation/human-actions";

import {
  openCourtConversation,
} from "@/lib/ui/court";

import {
  getDemoConfig,
  subscribeDemoConfig,
} from "@/lib/demo/config";

import {
  conveneCouncilForAudienceRequest,
  inspectAudienceRequests,
  presentAudienceRequest,
  respondToAudienceRequest,
} from "@/lib/politics/audience";

type CourtTab =
  | "court"
  | "audience"
  | "council";

export default function CourtPanel() {
  const world =
    useSyncExternalStore(
      subscribeWorldState,
      getWorldState,
      getWorldState
    );

  const demo =
    useSyncExternalStore(
      subscribeDemoConfig,
      getDemoConfig,
      getDemoConfig
    );

  const [
    tab,
    setTab,
  ] =
    useState<CourtTab>(
      "court"
    );

  const [
    status,
    setStatus,
  ] =
    useState<
      string |
      null
    >(
      null
    );

  if (
    demo.mode ===
    "observer"
  ) {
    return null;
  }

  const playerId =
    world.session
      .localPlayerId;

  const player =
    world.session
      .players[
        playerId
      ];

  if (!player) {
    return null;
  }

  const presentResult =
    humanInspectPresentCharacters(
      world.session.id,
      playerId
    );

  const presentCharacters =
    presentResult.ok
      ? presentResult
          .characters
      : [];

  const profiles =
    world.session
      .lords
      .profiles;

  const audienceResult =
    inspectAudienceRequests(
      world.session.id,
      playerId
    );

  const requests =
    audienceResult.ok
      ? audienceResult
          .requests
      : [];

  const pendingRequests =
    requests.filter(
      (request) =>
        request.status ===
          "REQUESTED" ||
        request.status ===
          "PRESENTED" ||
        request.status ===
          "DEFERRED"
    );

  const ownLords =
    Object.values(
      profiles
    )
      .filter(
        (profile) =>
          profile.kingdomId ===
          player.kingdomId
      )
      .sort(
        (a, b) =>
          b.politicalPower -
            a.politicalPower ||
          a.characterId
            .localeCompare(
              b.characterId
            )
      );

  function presentPetition(
    requestId:
      string
  ): void {
    const result =
      presentAudienceRequest(
        world.session.id,
        playerId,
        requestId
      );

    if (
      result.ok ===
      false
    ) {
      setStatus(
        `AUDIENCE REJECTED — ${result.error}`
      );

      return;
    }

    setStatus(
      "Petitioner has been admitted before the Crown."
    );
  }

  function council(
    requestId:
      string
  ): void {
    const presented =
      presentAudienceRequest(
        world.session.id,
        playerId,
        requestId
      );

    if (
      presented.ok ===
        false &&
      presented.error !==
        "AUDIENCE_REQUEST_NOT_PRESENTABLE"
    ) {
      setStatus(
        `COUNCIL REJECTED — ${presented.error}`
      );

      return;
    }

    const result =
      conveneCouncilForAudienceRequest(
        world.session.id,
        playerId,
        requestId
      );

    if (
      result.ok ===
      false
    ) {
      setStatus(
        `COUNCIL REJECTED — ${result.error}`
      );

      return;
    }

    setStatus(
      `COUNCIL — ${result.advice.recommendation}: ${result.advice.summary}`
    );

    setTab(
      "council"
    );
  }

  function respond(
    requestId:
      string,
    response:
      "ACCEPT" |
      "REFUSE" |
      "DEFER"
  ): void {
    const presented =
      presentAudienceRequest(
        world.session.id,
        playerId,
        requestId
      );

    if (
      presented.ok ===
        false &&
      presented.error !==
        "AUDIENCE_REQUEST_NOT_PRESENTABLE"
    ) {
      setStatus(
        `AUDIENCE REJECTED — ${presented.error}`
      );

      return;
    }

    const result =
      respondToAudienceRequest(
        world.session.id,
        playerId,
        requestId,
        response
      );

    if (
      result.ok ===
      false
    ) {
      setStatus(
        `AUDIENCE REJECTED — ${result.error}`
      );

      return;
    }

    setStatus(
      result
        .consequenceSummary
    );
  }

  return (
    <aside className="fixed left-5 top-[86px] z-[72] w-[330px] rounded-2xl border border-neutral-700/70 bg-[#0b0d0f]/94 text-neutral-100 shadow-2xl backdrop-blur">
      <div className="p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400">
          Royal Court
        </div>

        <div className="mt-1 text-sm font-semibold">
          Court, Audience & Council
        </div>
      </div>

      <div className="grid grid-cols-3 border-y border-neutral-800 text-[10px] font-semibold uppercase">
        {(
          [
            [
              "court",
              `Court ${presentCharacters.length}`,
            ],
            [
              "audience",
              `Audience ${pendingRequests.length}`,
            ],
            [
              "council",
              `Council ${ownLords.length}`,
            ],
          ] as const
        ).map(
          ([
            id,
            label,
          ]) => (
            <button
              key={
                id
              }
              type="button"
              onClick={() =>
                setTab(
                  id
                )
              }
              className={`px-2 py-3 ${
                tab ===
                id
                  ? "bg-amber-950/35 text-amber-200"
                  : "text-neutral-500 hover:text-neutral-200"
              }`}
            >
              {
                label
              }
            </button>
          )
        )}
      </div>

      <div className="max-h-[58vh] overflow-y-auto p-3">
        {tab ===
        "court" ? (
          <div className="space-y-2">
            {presentCharacters.length ===
            0 ? (
              <div className="rounded-xl border border-dashed border-neutral-800 p-3 text-xs leading-5 text-neutral-500">
                No important NPC is currently present with the ruler. Distant characters require a courier or envoy.
              </div>
            ) : (
              presentCharacters
                .slice(
                  0,
                  8
                )
                .map(
                  (
                    character
                  ) => {
                    const profile =
                      profiles[
                        character
                          .characterId
                      ];

                    return (
                      <button
                        key={
                          character
                            .characterId
                        }
                        type="button"
                        onClick={() =>
                          openCourtConversation(
                            character
                              .characterId
                          )
                        }
                        className="flex w-full items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/75 p-3 text-left transition hover:border-amber-700"
                      >
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-neutral-700 bg-neutral-950 text-lg">
                          {profile
                            ? "♜"
                            : "♟"}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">
                            {
                              character.name
                            }
                          </div>

                          <div className="truncate text-[10px] text-neutral-500">
                            {profile
                              ?.title ??
                              character.reason}
                          </div>

                          {profile ? (
                            <div className="mt-1 flex gap-3 text-[10px]">
                              <span className="text-emerald-300">
                                Loyalty{" "}
                                {
                                  profile.loyalty
                                }
                              </span>

                              <span className="text-neutral-500">
                                Relation{" "}
                                {
                                  profile.relationshipToRuler
                                }
                              </span>
                            </div>
                          ) : null}
                        </div>

                        <span className="text-[10px] font-semibold text-amber-300">
                          TALK
                        </span>
                      </button>
                    );
                  }
                )
            )}
          </div>
        ) : null}

        {tab ===
        "audience" ? (
          <div className="space-y-3">
            {pendingRequests.length ===
            0 ? (
              <div className="rounded-xl border border-dashed border-neutral-800 p-3 text-xs text-neutral-500">
                No pending petition currently awaits the Crown.
              </div>
            ) : (
              pendingRequests.map(
                (
                  request
                ) => {
                  const petitioner =
                    world
                      .characters[
                        request
                          .petitionerCharacterId
                      ];

                  return (
                    <div
                      key={
                        request.id
                      }
                      className="rounded-xl border border-violet-900/70 bg-violet-950/20 p-3"
                    >
                      <div className="text-[9px] font-semibold uppercase tracking-wider text-violet-300">
                        {request.kind.replaceAll("_", " ")} · {request.status}
                      </div>

                      <div className="mt-1 text-sm font-semibold">
                        {
                          request.title
                        }
                      </div>

                      <div className="mt-1 text-[10px] text-neutral-500">
                        {petitioner?.name ?? request.petitionerCharacterId}
                      </div>

                      <div className="mt-2 text-xs leading-5 text-neutral-300">
                        {
                          request.petition
                        }
                      </div>

                      {request.councilAdvice ? (
                        <div className="mt-2 rounded-lg border border-neutral-800 bg-black/20 p-2 text-[10px] text-neutral-400">
                          Council: {request.councilAdvice.recommendation} · {request.councilAdvice.summary}
                        </div>
                      ) : null}

                      {request.status ===
                      "REQUESTED" ||
                      request.status ===
                      "DEFERRED" ? (
                        <button
                          type="button"
                          onClick={() =>
                            presentPetition(
                              request.id
                            )
                          }
                          className="mt-3 w-full rounded-lg border border-amber-800 px-3 py-2 text-xs font-semibold text-amber-200"
                        >
                          HEAR PETITION
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() =>
                          council(
                            request.id
                          )
                        }
                        className="mt-2 w-full rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-200"
                      >
                        ASK THE COUNCIL
                      </button>

                      {request.status ===
                      "PRESENTED" ? (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              respond(
                                request.id,
                                "ACCEPT"
                              )
                            }
                            className="rounded-lg border border-emerald-800 bg-emerald-950/25 px-2 py-2 text-[10px] font-semibold text-emerald-200"
                          >
                            ACCEPT
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              respond(
                                request.id,
                                "REFUSE"
                              )
                            }
                            className="rounded-lg border border-red-800 bg-red-950/25 px-2 py-2 text-[10px] font-semibold text-red-200"
                          >
                            REFUSE
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              respond(
                                request.id,
                                "DEFER"
                              )
                            }
                            className="rounded-lg border border-neutral-700 px-2 py-2 text-[10px] text-neutral-300"
                          >
                            DEFER
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                }
              )
            )}
          </div>
        ) : null}

        {tab ===
        "council" ? (
          <div className="space-y-2">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 text-xs leading-5 text-neutral-400">
              Council advice reflects lord loyalty, relationship, political interests and the petition itself. It is advisory, not an automatic decision.
            </div>

            {ownLords.map(
              (
                lord
              ) => {
                const character =
                  world
                    .characters[
                      lord.characterId
                    ];

                return (
                  <div
                    key={
                      lord.characterId
                    }
                    className="rounded-xl border border-neutral-800 bg-neutral-900/65 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold">
                          {character?.name ?? lord.characterId}
                        </div>

                        <div className="text-[10px] text-neutral-500">
                          {
                            lord.title
                          }
                        </div>
                      </div>

                      <div className="text-right text-[10px]">
                        <div className="text-emerald-300">
                          Loyalty {lord.loyalty}
                        </div>

                        <div className="text-neutral-500">
                          Power {lord.politicalPower}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[9px] text-neutral-500">
                      <span>
                        Ambition {lord.basicTraits.ambition}
                      </span>
                      <span>
                        Honor {lord.basicTraits.honor}
                      </span>
                      <span>
                        Intrigue {lord.basicTraits.intrigue}
                      </span>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        ) : null}

        {status ? (
          <div className="mt-3 rounded-xl border border-amber-900/50 bg-amber-950/20 p-3 text-[10px] leading-5 text-amber-100">
            {
              status
            }
          </div>
        ) : null}
      </div>
    </aside>
  );
}
