type Listener = () => void;

export interface UiNavState {
  entered: boolean;
}

let state: UiNavState = {
  entered: false,
};

const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getUiNavState(): UiNavState {
  return state;
}

export function subscribeUiNav(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Called once the player has clicked past the GameShell menu/intro
 * flow, so GameRoot can unmount GameShell and show the live game.
 */
export function enterGame(): void {
  if (state.entered) {
    return;
  }
  state = { ...state, entered: true };
  emit();
}

/**
 * Called from anywhere in the game view (Observer Arena, the Realm
 * Command panel, etc.) to return to the GameShell menu.
 */
export function requestReturnToMenu(): void {
  if (!state.entered) {
    return;
  }
  state = { ...state, entered: false };
  emit();
}
