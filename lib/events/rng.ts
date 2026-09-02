export function deterministicUnitRoll(seed: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967296;
}

export function deterministicWeightedIndex(
  seed: string,
  weights: number[]
): number {
  const safeWeights = weights.map((weight) => Math.max(0, weight));
  const total = safeWeights.reduce((sum, weight) => sum + weight, 0);

  if (total <= 0) {
    return 0;
  }

  let cursor = deterministicUnitRoll(seed) * total;

  for (let index = 0; index < safeWeights.length; index += 1) {
    cursor -= safeWeights[index];

    if (cursor <= 0) {
      return index;
    }
  }

  return Math.max(0, safeWeights.length - 1);
}
