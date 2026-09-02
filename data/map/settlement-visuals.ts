import {
  getActiveGameMap,
} from "@/lib/map/map-registry";

export interface SettlementVisualDefinition {
  settlementId: string;

  x: number;

  y: number;

  iconUrl: string;

  scale?: number;

  labelOffsetX?: number;

  labelOffsetY?: number;
}

const activeMap =
  getActiveGameMap();

export const settlementVisuals:
  Record<
    string,
    SettlementVisualDefinition
  > =
  Object.fromEntries(
    Object.values(
      activeMap.nodes
    ).map(
      (node) => [
        node.id,

        {
          settlementId:
            node.locationId,

          x:
            node.x,

          y:
            node.y,

          iconUrl:
            node.iconUrl,

          scale:
            node.scale,

          labelOffsetX:
            node.labelOffsetX,

          labelOffsetY:
            node.labelOffsetY,
        },
      ]
    )
  );