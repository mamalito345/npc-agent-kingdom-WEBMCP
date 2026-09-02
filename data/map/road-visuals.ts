import {
  getActiveGameMap,
} from "@/lib/map/map-registry";

export interface RoadVisualPoint {
  x: number;

  y: number;
}

export interface RoadVisualDefinition {
  edgeId: string;

  points:
    RoadVisualPoint[];
}

const activeMap =
  getActiveGameMap();

export const roadVisuals:
  Record<
    string,
    RoadVisualDefinition
  > =
  Object.fromEntries(
    Object.values(
      activeMap.edges
    ).map(
      (edge) => [
        edge.id,

        {
          edgeId:
            edge.id,

          points:
            edge.points.map(
              (point) => ({
                x: point.x,
                y: point.y,
              })
            ),
        },
      ]
    )
  );