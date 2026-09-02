import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  WorldState,
} from "@/types/world";

const SAVE_KEY = "npc-kingdom-demo-save-v1";

export interface DemoSaveEnvelope {
  version: 1;
  savedAt: string;
  world: WorldState;
}

export function serializeDemoSave(): string {
  const envelope: DemoSaveEnvelope = {
    version: 1,
    savedAt: new Date().toISOString(),
    world: getRuntimeWorldState(),
  };

  return JSON.stringify(envelope);
}

export function restoreDemoSave(serialized: string): void {
  const envelope = JSON.parse(serialized) as DemoSaveEnvelope;

  if (
    !envelope ||
    envelope.version !== 1 ||
    !envelope.world ||
    !envelope.world.simulation ||
    !envelope.world.session
  ) {
    throw new Error("INVALID_DEMO_SAVE");
  }

  updateRuntimeWorldState(() => envelope.world);
}

export function saveDemoToBrowser(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SAVE_KEY, serializeDemoSave());
}

export function loadDemoFromBrowser(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const serialized = window.localStorage.getItem(SAVE_KEY);

  if (!serialized) {
    return false;
  }

  restoreDemoSave(serialized);
  return true;
}
