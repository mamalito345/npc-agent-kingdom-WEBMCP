import {
  getActiveGameMap,
} from "@/lib/map/map-registry";

export interface VisualMapConfig {
  imageUrl: string;

  width: number;

  height: number;

  minZoom: number;

  maxZoom: number;

  initialZoom: number;
}

const activeMap =
  getActiveGameMap();

export const visualMapConfig:
  VisualMapConfig = {
  imageUrl:
    activeMap.image.url,

  width:
    activeMap.image.width,

  height:
    activeMap.image.height,

  minZoom:
    activeMap.camera.minZoom,

  maxZoom:
    activeMap.camera.maxZoom,

  initialZoom:
    activeMap.camera.initialZoom,
};