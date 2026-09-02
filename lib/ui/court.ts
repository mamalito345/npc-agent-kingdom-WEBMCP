type Listener = () => void;

let selectedCourtCharacterId:
  string | null =
  null;

const listeners =
  new Set<Listener>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getSelectedCourtCharacterId():
  string | null {
  return selectedCourtCharacterId;
}

export function openCourtConversation(
  characterId: string
): void {
  selectedCourtCharacterId =
    characterId;

  emit();
}

export function closeCourtConversation():
  void {
  if (
    selectedCourtCharacterId ===
    null
  ) {
    return;
  }

  selectedCourtCharacterId =
    null;

  emit();
}

export function subscribeCourtConversation(
  listener: Listener
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
