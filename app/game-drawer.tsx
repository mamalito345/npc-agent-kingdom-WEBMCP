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
  closeGameDrawer,
  getGameDrawerState,
  setGameDrawerTab,
  subscribeGameDrawer,
} from "@/lib/ui/game-drawer";

import {
  issueCharacterOrder,
} from "@/lib/lords/service";

import {
  proposeAgreement,
  respondToAgreement,
} from "@/lib/politics/service";

import {
  sendPlayerMessage,
  sendPlayerEnvoy,
} from "@/lib/session/player-actions";

import {
  deleteBrowserSave,
  downloadDemoSave,
  saveDemoToBrowser,
} from "@/lib/demo/persistence";

import {
  getRealmControlLabel,
} from "@/lib/demo/realm-control";

import type {
  AgreementType,
} from "@/types/politics";

import type {
  LordOrderType,
} from "@/types/lords";

const AGREEMENT_TYPES:
  AgreementType[] = [
  "ALLIANCE",
  "NON_AGGRESSION",
  "MILITARY_SUPPORT",
  "PEACE",
];

const LORD_ORDER_TYPES:
  LordOrderType[] = [
  "RAISE_TROOPS",
  "BRING_ARMY",
  "REINFORCE",
  "DEFEND_SETTLEMENT",
  "HOLD_POSITION",
];

export default function GameDrawer() {
  const world =
    useSyncExternalStore(
      subscribeWorldState,
      getWorldState,
      getWorldState
    );

  const drawer =
    useSyncExternalStore(
      subscribeGameDrawer,
      getGameDrawerState,
      getGameDrawerState
    );

  const [
    messageText,
    setMessageText,
  ] =
    useState("");

  const [
    recipientId,
    setRecipientId,
  ] =
    useState("");

  const [
    envoy,
    setEnvoy,
  ] =
    useState(false);

  const [
    targetKingdomId,
    setTargetKingdomId,
  ] =
    useState("");

  const [
    agreementType,
    setAgreementType,
  ] =
    useState<AgreementType>(
      "NON_AGGRESSION"
    );

  const [
    agreementTerms,
    setAgreementTerms,
  ] =
    useState("");

  const [
    selectedLordId,
    setSelectedLordId,
  ] =
    useState("");

  const [
    lordOrderType,
    setLordOrderType,
  ] =
    useState<LordOrderType>(
      "HOLD_POSITION"
    );

  const [
    lordTarget,
    setLordTarget,
  ] =
    useState("");

  const [
    status,
    setStatus,
  ] =
    useState<string | null>(
      null
    );

  if (!drawer.open) {
    return null;
  }

  const playerId =
    world.session
      .localPlayerId;

  const player =
    world.session.players[
      playerId
    ];

  if (!player) {
    return null;
  }


  const deliveredMessages =
    Object.values(
      world.messages
    )
      .filter(
        (message) =>
          (
            message.recipientId ===
              player.characterId ||
            message.senderId ===
              player.characterId
          ) &&
          (
            message.deliveredAt !==
              undefined ||
            message.senderId ===
              player.characterId
          )
      )
      .sort(
        (a, b) =>
          (
            b.deliveredAt ??
            b.createdAt
          ) -
            (
              a.deliveredAt ??
              a.createdAt
            ) ||
          a.id.localeCompare(
            b.id
          )
      );

  const otherRulers =
    Object.values(
      world.session.players
    ).filter(
      (candidate) =>
        candidate.active &&
        candidate.id !==
          playerId
    );

  const ownLords =
    Object.values(
      world.session.lords
        .profiles
    ).filter(
      (lord) =>
        lord.kingdomId ===
        player.kingdomId
    );

  const ownAgreements =
    Object.values(
      world.session.politics
        .agreements
    ).filter(
      (agreement) =>
        agreement
          .partyKingdomIds
          .includes(
            player.kingdomId
          )
    );

  const pendingProposals =
    ownAgreements.filter(
      (agreement) =>
        agreement.status ===
          "PROPOSED" &&
        agreement
          .proposedToPlayerId ===
          playerId &&
        (
          agreement.deliveredAt !==
            undefined ||
          (
            agreement
              .proposalMessageId &&
            world.messages[
              agreement
                .proposalMessageId
            ]?.deliveredAt !==
              undefined
          )
        )
    );

  async function sendMessage():
    Promise<void> {
    if (
      !recipientId ||
      !messageText.trim()
    ) {
      return;
    }

    const result =
      envoy
        ? sendPlayerEnvoy(
            world.session.id,
            playerId,
            recipientId,
            messageText
          )
        : sendPlayerMessage(
            world.session.id,
            playerId,
            recipientId,
            messageText
          );

    if (!result.ok) {
      setStatus(
        `SEND FAILED — ${result.error}`
      );
      return;
    }

    setStatus(
      envoy
        ? "Envoy dispatched by courier."
        : "Message dispatched by courier."
    );

    setMessageText("");
  }

  function propose():
    void {
    if (!targetKingdomId) {
      return;
    }

    const result =
      proposeAgreement(
        world.session.id,
        playerId,
        agreementType,
        targetKingdomId,
        {
          terms:
            agreementTerms.trim() ||
            undefined,
        }
      );

    if (!result.ok) {
      setStatus(
        `DIPLOMACY FAILED — ${result.error}`
      );
      return;
    }

    setStatus(
      `${agreementType} proposal dispatched. It becomes actionable only after physical delivery.`
    );
  }

  async function issueLordOrder():
    Promise<void> {
    if (!selectedLordId) {
      return;
    }

    const result =
      await issueCharacterOrder(
        world.session.id,
        playerId,
        selectedLordId,
        {
          type:
            lordOrderType,
          targetNodeId:
            lordTarget ||
            undefined,
          targetSettlementId:
            lordTarget ||
            undefined,
          risk: 50,
          note:
            `Issued from Royal Council UI: ${lordOrderType}`,
        }
      );

    if (!result.ok) {
      setStatus(
        `LORD ORDER FAILED — ${result.error}`
      );
      return;
    }

    setStatus(
      "Lord order entered the canonical political/military order flow."
    );
  }

  return (
    <div className="fixed inset-0 z-[115] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm">
      <section className="flex max-h-[78vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-neutral-700 bg-[#0a0c0e] text-neutral-100 shadow-2xl">
        <header className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400">
              Royal Administration
            </div>
            <div className="mt-1 font-serif text-xl">
              {world.kingdoms[
                player.kingdomId
              ]?.name}
            </div>
          </div>

          <button
            type="button"
            onClick={
              closeGameDrawer
            }
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs"
          >
            Close
          </button>
        </header>

        <div className="flex border-b border-neutral-800 bg-neutral-950/80 px-4">
          {(
            [
              "messages",
              "diplomacy",
              "lords",
              "save",
            ] as const
          ).map(
            (tab) => (
              <button
                key={tab}
                type="button"
                onClick={() =>
                  setGameDrawerTab(
                    tab
                  )
                }
                className={`border-b-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider ${
                  drawer.tab ===
                  tab
                    ? "border-amber-400 text-amber-300"
                    : "border-transparent text-neutral-500"
                }`}
              >
                {tab}
              </button>
            )
          )}
        </div>

        {status ? (
          <div className="border-b border-neutral-800 bg-neutral-900 px-5 py-2 text-xs text-neutral-300">
            {status}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {drawer.tab ===
          "messages" ? (
            <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
              <div>
                <h3 className="text-sm font-semibold">
                  Courier Inbox
                </h3>

                <div className="mt-3 space-y-2">
                  {deliveredMessages.length ===
                  0 ? (
                    <div className="rounded-xl border border-dashed border-neutral-800 p-4 text-xs text-neutral-500">
                      No delivered correspondence.
                    </div>
                  ) : (
                    deliveredMessages.map(
                      (message) => {
                        const outgoing =
                          message.senderId ===
                          player
                            .characterId;

                        const otherId =
                          outgoing
                            ? message
                                .recipientId
                            : message
                                .senderId;

                        return (
                          <div
                            key={
                              message.id
                            }
                            className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3"
                          >
                            <div className="flex justify-between text-[10px] uppercase tracking-wider text-neutral-500">
                              <span>
                                {outgoing
                                  ? "Sent to"
                                  : "From"}{" "}
                                {
                                  world
                                    .characters[
                                      otherId
                                    ]
                                    ?.name ??
                                  otherId
                                }
                              </span>
                              <span>
                                {message
                                  .deliveredAt !==
                                undefined
                                  ? "DELIVERED"
                                  : "IN TRANSIT"}
                              </span>
                            </div>

                            <div className="mt-2 text-sm leading-6">
                              {
                                message.content
                              }
                            </div>

                            <div className="mt-2 text-[10px] text-neutral-600">
                              Sent minute{" "}
                              {
                                message.createdAt
                              }
                              {message
                                .deliveredAt !==
                              undefined
                                ? ` · delivered ${message.deliveredAt}`
                                : ""}
                            </div>
                          </div>
                        );
                      }
                    )
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
                <h3 className="text-sm font-semibold">
                  Dispatch
                </h3>

                <select
                  value={
                    recipientId
                  }
                  onChange={(
                    event
                  ) =>
                    setRecipientId(
                      event.target
                        .value
                    )
                  }
                  className="mt-3 w-full rounded-lg border border-neutral-700 bg-neutral-950 p-2 text-sm"
                >
                  <option value="">
                    Choose recipient
                  </option>

                  {Object.values(
                    world.characters
                  )
                    .filter(
                      (character) =>
                        character.id !==
                        player
                          .characterId
                    )
                    .map(
                      (character) => (
                        <option
                          key={
                            character.id
                          }
                          value={
                            character.id
                          }
                        >
                          {
                            character.name
                          }{" "}
                          ·{" "}
                          {
                            character.rank
                          }
                        </option>
                      )
                    )}
                </select>

                <textarea
                  value={
                    messageText
                  }
                  onChange={(
                    event
                  ) =>
                    setMessageText(
                      event.target
                        .value
                    )
                  }
                  rows={5}
                  placeholder="Write a royal message..."
                  className="mt-3 w-full resize-none rounded-lg border border-neutral-700 bg-neutral-950 p-3 text-sm"
                />

                <label className="mt-3 flex items-center gap-2 text-xs text-neutral-400">
                  <input
                    type="checkbox"
                    checked={
                      envoy
                    }
                    onChange={(
                      event
                    ) =>
                      setEnvoy(
                        event.target
                          .checked
                      )
                    }
                  />
                  Send as formal envoy
                </label>

                <button
                  type="button"
                  onClick={() =>
                    void sendMessage()
                  }
                  className="mt-4 w-full rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-black"
                >
                  Dispatch Courier
                </button>
              </div>
            </div>
          ) : null}

          {drawer.tab ===
          "diplomacy" ? (
            <div className="grid gap-5 lg:grid-cols-2">
              <section>
                <h3 className="text-sm font-semibold">
                  Realm Relations
                </h3>

                <div className="mt-3 space-y-2">
                  {otherRulers.map(
                    (other) => (
                      <div
                        key={
                          other.id
                        }
                        className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold">
                              {
                                world
                                  .kingdoms[
                                    other
                                      .kingdomId
                                  ]
                                  ?.name
                              }
                            </div>

                            <div className="mt-1 text-[10px] text-neutral-500">
                              {
                                world
                                  .characters[
                                    other
                                      .characterId
                                  ]
                                  ?.name
                              }{" "}
                              ·{" "}
                              {
                                getRealmControlLabel(
                                  other
                                    .kingdomId
                                )
                              }
                            </div>
                          </div>

                          <div className="text-sm">
                            {
                              world
                                .kingdoms[
                                  player
                                    .kingdomId
                                ]
                                ?.relations[
                                  other
                                    .kingdomId
                                ] ??
                              0
                            }
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>

                <h3 className="mt-5 text-sm font-semibold">
                  Existing Agreements
                </h3>

                <div className="mt-3 space-y-2">
                  {ownAgreements.map(
                    (agreement) => (
                      <div
                        key={
                          agreement.id
                        }
                        className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 text-xs"
                      >
                        <div className="font-semibold">
                          {
                            agreement.type
                          }{" "}
                          ·{" "}
                          {
                            agreement.status
                          }
                        </div>

                        <div className="mt-1 text-neutral-500">
                          {
                            agreement
                              .partyKingdomIds
                              .join(
                                " ↔ "
                              )
                          }
                        </div>

                        {agreement.terms ? (
                          <div className="mt-2 text-neutral-300">
                            {
                              agreement.terms
                            }
                          </div>
                        ) : null}
                      </div>
                    )
                  )}

                  {ownAgreements.length ===
                  0 ? (
                    <div className="text-xs text-neutral-600">
                      No agreements.
                    </div>
                  ) : null}
                </div>
              </section>

              <section>
                {pendingProposals.length >
                0 ? (
                  <div className="mb-5 rounded-xl border border-violet-700 bg-violet-950/20 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-violet-300">
                      Awaiting Royal Decision
                    </div>

                    <div className="mt-3 space-y-2">
                      {pendingProposals.map(
                        (
                          proposal
                        ) => (
                          <div
                            key={
                              proposal.id
                            }
                            className="rounded-lg border border-violet-900 bg-black/25 p-3 text-xs"
                          >
                            <div className="font-semibold">
                              {
                                proposal.type
                              }
                            </div>

                            <div className="mt-1 text-neutral-400">
                              {
                                proposal.terms ??
                                "No additional terms."
                              }
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const result =
                                    respondToAgreement(
                                      world
                                        .session
                                        .id,
                                      playerId,
                                      proposal.id,
                                      false
                                    );

                                  setStatus(
                                    result.ok
                                      ? "Proposal rejected."
                                      : `REJECT FAILED — ${result.error}`
                                  );
                                }}
                                className="rounded border border-neutral-700 px-2 py-2"
                              >
                                Reject
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const result =
                                    respondToAgreement(
                                      world
                                        .session
                                        .id,
                                      playerId,
                                      proposal.id,
                                      true
                                    );

                                  setStatus(
                                    result.ok
                                      ? "Proposal accepted."
                                      : `ACCEPT FAILED — ${result.error}`
                                  );
                                }}
                                className="rounded bg-violet-500 px-2 py-2 font-semibold text-white"
                              >
                                Accept
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
                  <h3 className="text-sm font-semibold">
                    New Diplomatic Proposal
                  </h3>

                  <select
                    value={
                      targetKingdomId
                    }
                    onChange={(
                      event
                    ) =>
                      setTargetKingdomId(
                        event.target
                          .value
                      )
                    }
                    className="mt-3 w-full rounded border border-neutral-700 bg-neutral-950 p-2 text-sm"
                  >
                    <option value="">
                      Choose realm
                    </option>

                    {otherRulers.map(
                      (other) => (
                        <option
                          key={
                            other.id
                          }
                          value={
                            other
                              .kingdomId
                          }
                        >
                          {
                            world
                              .kingdoms[
                                other
                                  .kingdomId
                              ]
                              ?.name
                          }
                        </option>
                      )
                    )}
                  </select>

                  <select
                    value={
                      agreementType
                    }
                    onChange={(
                      event
                    ) =>
                      setAgreementType(
                        event.target
                          .value as AgreementType
                      )
                    }
                    className="mt-3 w-full rounded border border-neutral-700 bg-neutral-950 p-2 text-sm"
                  >
                    {AGREEMENT_TYPES.map(
                      (type) => (
                        <option
                          key={
                            type
                          }
                          value={
                            type
                          }
                        >
                          {type}
                        </option>
                      )
                    )}
                  </select>

                  <textarea
                    value={
                      agreementTerms
                    }
                    onChange={(
                      event
                    ) =>
                      setAgreementTerms(
                        event.target
                          .value
                      )
                    }
                    rows={4}
                    placeholder="Terms..."
                    className="mt-3 w-full rounded border border-neutral-700 bg-neutral-950 p-3 text-sm"
                  />

                  <button
                    type="button"
                    onClick={
                      propose
                    }
                    className="mt-3 w-full rounded-lg bg-violet-500 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Send Proposal
                  </button>
                </div>
              </section>
            </div>
          ) : null}

          {drawer.tab ===
          "lords" ? (
            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <section>
                <h3 className="text-sm font-semibold">
                  Lords of the Realm
                </h3>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {ownLords.map(
                    (lord) => {
                      const character =
                        world
                          .characters[
                            lord
                              .characterId
                          ];

                      return (
                        <button
                          key={
                            lord
                              .characterId
                          }
                          type="button"
                          onClick={() =>
                            setSelectedLordId(
                              lord
                                .characterId
                            )
                          }
                          className={`rounded-xl border p-4 text-left ${
                            selectedLordId ===
                            lord
                              .characterId
                              ? "border-amber-500 bg-amber-950/20"
                              : "border-neutral-800 bg-neutral-900/60"
                          }`}
                        >
                          <div className="text-sm font-semibold">
                            ♜{" "}
                            {
                              character
                                ?.name ??
                              lord
                                .characterId
                            }
                          </div>

                          <div className="mt-1 text-xs text-neutral-500">
                            {
                              lord.title
                            }
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
                            <div className="rounded bg-neutral-950 p-2">
                              <div className="text-neutral-600">
                                Loyalty
                              </div>
                              <div className="mt-1 text-emerald-300">
                                {
                                  lord
                                    .loyalty
                                }
                              </div>
                            </div>

                            <div className="rounded bg-neutral-950 p-2">
                              <div className="text-neutral-600">
                                Relation
                              </div>
                              <div className="mt-1">
                                {
                                  lord
                                    .relationshipToRuler
                                }
                              </div>
                            </div>

                            <div className="rounded bg-neutral-950 p-2">
                              <div className="text-neutral-600">
                                Power
                              </div>
                              <div className="mt-1">
                                {
                                  lord
                                    .politicalPower
                                }
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 text-[10px] text-neutral-500">
                            Armies:{" "}
                            {
                              lord
                                .controlledArmyIds
                                .length
                            }{" "}
                            · Settlements:{" "}
                            {
                              lord
                                .controlledSettlementIds
                                .length
                            }
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
                <h3 className="text-sm font-semibold">
                  Issue Character Order
                </h3>

                <select
                  value={
                    selectedLordId
                  }
                  onChange={(
                    event
                  ) =>
                    setSelectedLordId(
                      event.target
                        .value
                    )
                  }
                  className="mt-3 w-full rounded border border-neutral-700 bg-neutral-950 p-2 text-sm"
                >
                  <option value="">
                    Choose lord
                  </option>

                  {ownLords.map(
                    (lord) => (
                      <option
                        key={
                          lord
                            .characterId
                        }
                        value={
                          lord
                            .characterId
                        }
                      >
                        {
                          world
                            .characters[
                              lord
                                .characterId
                            ]
                            ?.name
                        }{" "}
                        ·{" "}
                        {
                          lord.title
                        }
                      </option>
                    )
                  )}
                </select>

                <select
                  value={
                    lordOrderType
                  }
                  onChange={(
                    event
                  ) =>
                    setLordOrderType(
                      event.target
                        .value as LordOrderType
                    )
                  }
                  className="mt-3 w-full rounded border border-neutral-700 bg-neutral-950 p-2 text-sm"
                >
                  {LORD_ORDER_TYPES.map(
                    (type) => (
                      <option
                        key={
                          type
                        }
                        value={
                          type
                        }
                      >
                        {type}
                      </option>
                    )
                  )}
                </select>

                <select
                  value={
                    lordTarget
                  }
                  onChange={(
                    event
                  ) =>
                    setLordTarget(
                      event.target
                        .value
                    )
                  }
                  className="mt-3 w-full rounded border border-neutral-700 bg-neutral-950 p-2 text-sm"
                >
                  <option value="">
                    No target / current position
                  </option>

                  {Object.values(
                    world.locations
                  ).map(
                    (location) => (
                      <option
                        key={
                          location.id
                        }
                        value={
                          location.id
                        }
                      >
                        {
                          location.name
                        }
                      </option>
                    )
                  )}
                </select>

                <div className="mt-3 rounded-lg border border-violet-900 bg-violet-950/20 p-3 text-xs leading-5 text-violet-200">
                  This is a request to an independent lord. The GM Character may ACCEPT, REFUSE, DELAY, NEGOTIATE or PARTIALLY COMPLY. Accepted military orders move the lord&apos;s real household army.
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void issueLordOrder()
                  }
                  className="mt-3 w-full rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-black"
                >
                  Issue Order
                </button>
              </section>
            </div>
          ) : null}

          {drawer.tab ===
          "save" ? (
            <section className="mx-auto max-w-xl">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
                <div className="text-xs uppercase tracking-[0.2em] text-amber-400">
                  Campaign Persistence
                </div>

                <h3 className="mt-2 font-serif text-2xl">
                  Save the living world
                </h3>

                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  The snapshot contains canonical WorldState: armies, movement, politics, conversations, event history, campaign controller roles and GM runtime state.
                </p>

                <div className="mt-5 grid gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      saveDemoToBrowser();
                      setStatus(
                        "Campaign saved to browser."
                      );
                    }}
                    className="rounded-lg bg-amber-400 px-3 py-3 text-sm font-semibold text-black"
                  >
                    Save Campaign
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      downloadDemoSave();
                      setStatus(
                        "Save file downloaded."
                      );
                    }}
                    className="rounded-lg border border-neutral-700 px-3 py-3 text-sm"
                  >
                    Download JSON Save
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      deleteBrowserSave();
                      setStatus(
                        "Browser save deleted."
                      );
                    }}
                    className="rounded-lg border border-red-900 px-3 py-3 text-sm text-red-300"
                  >
                    Delete Browser Save
                  </button>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}
