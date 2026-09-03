function hashString(
  value: string
): number {
  let hash =
    2166136261;

  for (
    let i = 0;
    i < value.length;
    i += 1
  ) {
    hash ^=
      value.charCodeAt(
        i
      );

    hash =
      Math.imul(
        hash,
        16777619
      );
  }

  return (
    hash >>> 0
  );
}

export function deterministicBattleRandom(
  battleId: string,
  battleHour: number,
  key: string
): number {
  const hash =
    hashString(
      `${battleId}:${battleHour}:${key}`
    );

  return (
    hash /
    4294967295
  );
}

export function deterministicBattleVariance(
  battleId: string,
  battleHour: number,
  key: string,
  minimum = 0.82,
  maximum = 1.18
): number {
  const roll =
    deterministicBattleRandom(
      battleId,
      battleHour,
      key
    );

  return (
    minimum +
    (
      maximum -
      minimum
    ) *
      roll
  );
}