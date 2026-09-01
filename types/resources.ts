export interface ResourceStockpile {
  food: number;
  gold: number;
  wood: number;
  stone: number;
  metal: number;
}

export const ZERO_RESOURCES: ResourceStockpile = {
  food: 0,
  gold: 0,
  wood: 0,
  stone: 0,
  metal: 0,
};

export function addResources(
  current: ResourceStockpile,
  delta: ResourceStockpile
): ResourceStockpile {
  return {
    food: current.food + delta.food,
    gold: current.gold + delta.gold,
    wood: current.wood + delta.wood,
    stone: current.stone + delta.stone,
    metal: current.metal + delta.metal,
  };
}