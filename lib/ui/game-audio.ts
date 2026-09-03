export type GameAudioCue =
  | "battle_started"
  | "battle_crisis"
  | "siege_started"
  | "important_message"
  | "audience"
  | "victory"
  | "defeat";

let audioContext:
  AudioContext | null =
  null;

function context():
  AudioContext | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  const AudioContextCtor =
    window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext?:
          typeof AudioContext;
      }
    ).webkitAudioContext;

  if (!AudioContextCtor) {
    return null;
  }

  if (!audioContext) {
    audioContext =
      new AudioContextCtor();
  }

  return audioContext;
}

export async function unlockGameAudio():
  Promise<boolean> {
  const ctx =
    context();

  if (!ctx) {
    return false;
  }

  if (
    ctx.state ===
    "suspended"
  ) {
    await ctx.resume();
  }

  return (
    ctx.state ===
    "running"
  );
}

function tone(
  frequency:
    number,
  duration:
    number,
  gain:
    number,
  delay =
    0
): void {
  const ctx =
    context();

  if (
    !ctx ||
    ctx.state !==
      "running"
  ) {
    return;
  }

  const oscillator =
    ctx.createOscillator();

  const amplifier =
    ctx.createGain();

  const startsAt =
    ctx.currentTime +
    delay;

  oscillator.frequency
    .setValueAtTime(
      frequency,
      startsAt
    );

  oscillator.type =
    "triangle";

  amplifier.gain
    .setValueAtTime(
      0.0001,
      startsAt
    );

  amplifier.gain
    .exponentialRampToValueAtTime(
      gain,
      startsAt +
        0.015
    );

  amplifier.gain
    .exponentialRampToValueAtTime(
      0.0001,
      startsAt +
        duration
    );

  oscillator.connect(
    amplifier
  );

  amplifier.connect(
    ctx.destination
  );

  oscillator.start(
    startsAt
  );

  oscillator.stop(
    startsAt +
      duration +
      0.02
  );
}

export function playGameAudioCue(
  cue:
    GameAudioCue
): void {
  switch (
    cue
  ) {
    case "battle_started":
      tone(
        110,
        0.5,
        0.09
      );
      tone(
        82,
        0.6,
        0.07,
        0.18
      );
      break;

    case "battle_crisis":
      tone(
        170,
        0.22,
        0.08
      );
      tone(
        145,
        0.22,
        0.08,
        0.23
      );
      tone(
        120,
        0.32,
        0.08,
        0.46
      );
      break;

    case "siege_started":
      tone(
        74,
        0.7,
        0.08
      );
      tone(
        62,
        0.8,
        0.07,
        0.26
      );
      break;

    case "important_message":
      tone(
        440,
        0.13,
        0.04
      );
      tone(
        587,
        0.18,
        0.04,
        0.14
      );
      break;

    case "audience":
      tone(
        330,
        0.16,
        0.035
      );
      tone(
        392,
        0.18,
        0.035,
        0.18
      );
      break;

    case "victory":
      tone(
        392,
        0.24,
        0.05
      );
      tone(
        523,
        0.3,
        0.055,
        0.22
      );
      tone(
        659,
        0.55,
        0.06,
        0.5
      );
      break;

    case "defeat":
      tone(
        196,
        0.3,
        0.05
      );
      tone(
        147,
        0.38,
        0.05,
        0.27
      );
      tone(
        98,
        0.7,
        0.055,
        0.62
      );
      break;
  }
}
