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

/*
 * Dense strategic maps contain two node classes:
 *
 * settlement
 * → visible gameplay landmark
 *
 * transit
 * → canonical movement/pathfinding point, hidden from normal UI
 *
 * Never derive settlement visuals from every map node.
 */
export const settlementVisuals:
  Record<
    string,
    SettlementVisualDefinition
  > =
  Object.fromEntries(
    Object.values(
      activeMap.nodes
    )
      .filter(
        (
          node
        ): node is typeof node & {
          locationId: string;
          iconUrl: string;
        } =>
          node.kind !==
            "transit" &&
          node.hidden !==
            true &&
          typeof node.locationId ===
            "string" &&
          typeof node.iconUrl ===
            "string"
      )
      .map(
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
