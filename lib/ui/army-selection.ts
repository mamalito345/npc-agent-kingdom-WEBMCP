let selectedArmyId:
  string | null =
  null;

type Listener =
  () => void;

const listeners =
  new Set<Listener>();

function emit(): void {
  for (
    const listener
    of listeners
  ) {
    listener();
  }
}

export function getSelectedArmyId():
  string | null {
  return selectedArmyId;
}

export function selectArmy(
  armyId:
    string | null
): void {
  if (
    selectedArmyId ===
    armyId
  ) {
    return;
  }

  selectedArmyId =
    armyId;

  emit();
}

export function subscribeArmySelection(
  listener:
    Listener
): () => void {
  listeners.add(
    listener
  );

  return () => {
    listeners.delete(
      listener
    );
  };
}