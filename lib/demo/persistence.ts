import {
  getRuntimeWorldState,
  updateRuntimeWorldState,
} from "@/lib/world/runtime";

import type {
  WorldState,
} from "@/types/world";

const SAVE_KEY =
  "npc-kingdom-demo-save-v1";

export interface DemoSaveEnvelope {
  version: 1;
  savedAt: string;
  world: WorldState;
}

export function serializeDemoSave(): string {
  const envelope:
    DemoSaveEnvelope = {
    version: 1,
    savedAt:
      new Date().toISOString(),
    world:
      getRuntimeWorldState(),
  };

  return JSON.stringify(
    envelope,
    null,
    2
  );
}

export function restoreDemoSave(
  serialized: string
): void {
  const envelope =
    JSON.parse(
      serialized
    ) as DemoSaveEnvelope;

  if (
    !envelope ||
    envelope.version !== 1 ||
    !envelope.world ||
    !envelope.world.simulation ||
    !envelope.world.session
  ) {
    throw new Error(
      "INVALID_DEMO_SAVE"
    );
  }

  updateRuntimeWorldState(
    () =>
      envelope.world
  );
}

export function saveDemoToBrowser():
  void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.setItem(
    SAVE_KEY,
    serializeDemoSave()
  );
}

export function hasBrowserSave():
  boolean {
  if (
    typeof window ===
    "undefined"
  ) {
    return false;
  }

  return Boolean(
    window.localStorage.getItem(
      SAVE_KEY
    )
  );
}

export function loadDemoFromBrowser():
  boolean {
  if (
    typeof window ===
    "undefined"
  ) {
    return false;
  }

  const serialized =
    window.localStorage.getItem(
      SAVE_KEY
    );

  if (!serialized) {
    return false;
  }

  restoreDemoSave(
    serialized
  );

  return true;
}

export function deleteBrowserSave():
  void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.localStorage.removeItem(
    SAVE_KEY
  );
}

export function downloadDemoSave(
  filename =
    "five-kingdoms-save.json"
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const blob =
    new Blob(
      [
        serializeDemoSave(),
      ],
      {
        type:
          "application/json",
      }
    );

  const url =
    window.URL.createObjectURL(
      blob
    );

  const anchor =
    document.createElement(
      "a"
    );

  anchor.href =
    url;

  anchor.download =
    filename;

  document.body.appendChild(
    anchor
  );

  anchor.click();

  document.body.removeChild(
    anchor
  );

  window.URL.revokeObjectURL(
    url
  );
}

export async function importDemoSaveFile(
  file: File
): Promise<void> {
  const text =
    await file.text();

  restoreDemoSave(
    text
  );

  saveDemoToBrowser();
}
