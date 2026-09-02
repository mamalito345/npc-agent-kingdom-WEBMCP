type Listener = () => void;

export type GameDrawerTab =
  | "messages"
  | "diplomacy"
  | "lords"
  | "save";

export interface GameDrawerState {
  open: boolean;
  tab: GameDrawerTab;
}

let state: GameDrawerState = {
  open: false,
  tab: "messages",
};

const listeners =
  new Set<Listener>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getGameDrawerState():
  GameDrawerState {
  return state;
}

export function subscribeGameDrawer(
  listener: Listener
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function openGameDrawer(
  tab: GameDrawerTab
): void {
  state = {
    open: true,
    tab,
  };

  emit();
}

export function closeGameDrawer():
  void {
  state = {
    ...state,
    open: false,
  };

  emit();
}

export function setGameDrawerTab(
  tab: GameDrawerTab
): void {
  state = {
    open: true,
    tab,
  };

  emit();
}
