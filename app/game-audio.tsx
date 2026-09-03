"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  getWorldState,
  subscribeWorldState,
} from "@/lib/world/state";

import {
  inspectPlayerCampaignStatus,
} from "@/lib/session/campaign-observation";

import {
  inspectAudienceRequests,
} from "@/lib/politics/audience";

import {
  playGameAudioCue,
  unlockGameAudio,
} from "@/lib/ui/game-audio";

export default function GameAudio() {
  const world =
    useSyncExternalStore(
      subscribeWorldState,
      getWorldState,
      getWorldState
    );

  const [
    enabled,
    setEnabled,
  ] =
    useState(
      false
    );

  const initialized =
    useRef(
      false
    );

  const battleIds =
    useRef<
      Set<string>
    >(
      new Set()
    );

  const siegeIds =
    useRef<
      Set<string>
    >(
      new Set()
    );

  const messageIds =
    useRef<
      Set<string>
    >(
      new Set()
    );

  const audienceIds =
    useRef<
      Set<string>
    >(
      new Set()
    );

  const lastOutcome =
    useRef<
      "ONGOING" |
      "VICTORY" |
      "DEFEAT"
    >(
      "ONGOING"
    );

  const playerId =
    world.session
      .localPlayerId;

  const player =
    world.session
      .players[
        playerId
      ];

  useEffect(() => {
    const activeBattles =
      Object.values(
        world.battles
      ).filter(
        (battle) =>
          battle.status ===
          "active"
      );

    const activeSieges =
      Object.values(
        world.sieges
      ).filter(
        (siege) =>
          siege.status ===
          "active"
      );

    const deliveredMessages =
      player
        ? Object.values(
            world.messages
          ).filter(
            (message) =>
              message.recipientId ===
                player.characterId &&
              message.deliveredAt !==
                undefined
          )
        : [];

    const audience =
      inspectAudienceRequests(
        world.session.id,
        playerId
      );

    const pendingAudience =
      audience.ok
        ? audience
            .requests
            .filter(
              (request) =>
                request.status ===
                  "REQUESTED" ||
                request.status ===
                  "PRESENTED"
            )
        : [];

    if (
      !initialized.current
    ) {
      battleIds.current =
        new Set(
          activeBattles.map(
            (battle) =>
              battle.id
          )
        );

      siegeIds.current =
        new Set(
          activeSieges.map(
            (siege) =>
              siege.id
          )
        );

      messageIds.current =
        new Set(
          deliveredMessages.map(
            (message) =>
              message.id
          )
        );

      audienceIds.current =
        new Set(
          pendingAudience.map(
            (request) =>
              request.id
          )
        );

      const campaign =
        inspectPlayerCampaignStatus(
          world.session.id,
          playerId
        );

      if (campaign.ok) {
        lastOutcome.current =
          campaign
            .status
            .outcome;
      }

      initialized.current =
        true;

      return;
    }

    if (!enabled) {
      battleIds.current =
        new Set(
          activeBattles.map(
            (battle) =>
              battle.id
          )
        );

      siegeIds.current =
        new Set(
          activeSieges.map(
            (siege) =>
              siege.id
          )
        );

      messageIds.current =
        new Set(
          deliveredMessages.map(
            (message) =>
              message.id
          )
        );

      audienceIds.current =
        new Set(
          pendingAudience.map(
            (request) =>
              request.id
          )
        );

      return;
    }

    for (
      const battle
      of activeBattles
    ) {
      if (
        !battleIds.current
          .has(
            battle.id
          )
      ) {
        playGameAudioCue(
          "battle_started"
        );
      }
    }

    for (
      const siege
      of activeSieges
    ) {
      if (
        !siegeIds.current
          .has(
            siege.id
          )
      ) {
        playGameAudioCue(
          "siege_started"
        );
      }
    }

    for (
      const message
      of deliveredMessages
    ) {
      if (
        !messageIds.current
          .has(
            message.id
          )
      ) {
        playGameAudioCue(
          "important_message"
        );
      }
    }

    for (
      const request
      of pendingAudience
    ) {
      if (
        !audienceIds.current
          .has(
            request.id
          )
      ) {
        playGameAudioCue(
          "audience"
        );
      }
    }

    if (
      world.session
        .commandCycle
        .interrupt
        ?.type ===
        "BATTLE_CRISIS"
    ) {
      playGameAudioCue(
        "battle_crisis"
      );
    }

    const campaign =
      inspectPlayerCampaignStatus(
        world.session.id,
        playerId
      );

    if (
      campaign.ok &&
      campaign.status
        .outcome !==
        lastOutcome.current
    ) {
      if (
        campaign.status
          .outcome ===
        "VICTORY"
      ) {
        playGameAudioCue(
          "victory"
        );
      } else if (
        campaign.status
          .outcome ===
        "DEFEAT"
      ) {
        playGameAudioCue(
          "defeat"
        );
      }

      lastOutcome.current =
        campaign
          .status
          .outcome;
    }

    battleIds.current =
      new Set(
        activeBattles.map(
          (battle) =>
            battle.id
        )
      );

    siegeIds.current =
      new Set(
        activeSieges.map(
          (siege) =>
            siege.id
        )
      );

    messageIds.current =
      new Set(
        deliveredMessages.map(
          (message) =>
            message.id
        )
      );

    audienceIds.current =
      new Set(
        pendingAudience.map(
          (request) =>
            request.id
        )
      );
  }, [
    enabled,
    player,
    playerId,
    world,
  ]);

  async function toggle():
    Promise<void> {
    if (enabled) {
      setEnabled(
        false
      );

      return;
    }

    const unlocked =
      await unlockGameAudio();

    setEnabled(
      unlocked
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        void toggle();
      }}
      className={`fixed left-1/2 top-[82px] z-[68] -translate-x-1/2 rounded-full border px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] shadow-lg backdrop-blur ${
        enabled
          ? "border-amber-600/70 bg-amber-950/70 text-amber-100"
          : "border-neutral-700 bg-black/60 text-neutral-500"
      }`}
    >
      {enabled
        ? "Sound On"
        : "Sound Off"}
    </button>
  );
}
