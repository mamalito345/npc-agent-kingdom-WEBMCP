type Listener = () => void;

export interface MapInteractionState {
  selectedArmyId: string | null;
  selectedSettlementId: string | null;
  destinationSettlementId: string | null;
}

let state: MapInteractionState = {
  selectedArmyId: null,
  selectedSettlementId: null,
  destinationSettlementId: null,
};

const listeners =
  new Set<Listener>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getMapInteractionState():
  MapInteractionState {
  return state;
}

export function subscribeMapInteraction(
  listener: Listener
): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function selectMapArmy(
  armyId: string | null
): void {
  state = {
    ...state,
    selectedArmyId: armyId,
    destinationSettlementId: null,
  };

  emit();
}

export function selectMapSettlement(
  settlementId: string | null
): void {
  state = {
    ...state,
    selectedSettlementId:
      settlementId,
  };

  emit();
}

export function chooseMapDestination(
  settlementId: string | null
): void {
  state = {
    ...state,
    destinationSettlementId:
      settlementId,
    selectedSettlementId:
      settlementId,
  };

  emit();
}

export function clearMapDestination():
  void {
  if (
    state.destinationSettlementId ===
    null
  ) {
    return;
  }

  state = {
    ...state,
    destinationSettlementId:
      null,
  };

  emit();
}
