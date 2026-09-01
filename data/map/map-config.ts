export interface VisualMapConfig {
  imageUrl: string;

  width: number;

  height: number;

  minZoom: number;

  maxZoom: number;

  initialZoom: number;
}

export const visualMapConfig: VisualMapConfig = {
  imageUrl:
    "/maps/world-map.png",

  width: 5000,

  height: 3200,

  minZoom: 0.25,

  maxZoom: 2.5,

  initialZoom: 0.55,
};