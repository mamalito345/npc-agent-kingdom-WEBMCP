type Listener =
  () => void;

export interface MapInteractionState {
  selectedArmyId:
    string | null;

  targetArmyId:
    string | null;

  selectedSettlementId:
    string | null;

  selectedStrategicNodeId:
    string | null;

  destinationSettlementId:
    string | null;

  destinationNodeId:
    string | null;

  changingOrderId:
    string | null;
}

let state:
  MapInteractionState = {
  selectedArmyId:
    null,

  targetArmyId:
    null,

  selectedSettlementId:
    null,

  selectedStrategicNodeId:
    null,

  destinationSettlementId:
    null,

  destinationNodeId:
    null,

  changingOrderId:
    null,
};

const listeners =
  new Set<
    Listener
  >();

function emit():
  void {
  for (
    const listener
    of listeners
  ) {
    listener();
  }
}

export function getMapInteractionState():
  MapInteractionState {
  return state;
}

export function subscribeMapInteraction(
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

export function selectMapArmy(
  armyId:
    string | null
): void {
  state = {
    ...state,

    selectedArmyId:
      armyId,

    targetArmyId:
      null,

    destinationSettlementId:
      null,

    destinationNodeId:
      null,

    changingOrderId:
      null,
  };

  emit();
}

export function targetMapArmy(
  armyId:
    string | null
): void {
  state = {
    ...state,

    targetArmyId:
      armyId,

    selectedSettlementId:
      null,

    selectedStrategicNodeId:
      null,

    destinationSettlementId:
      null,

    destinationNodeId:
      null,
  };

  emit();
}

export function clearMapTarget():
  void {
  if (
    state.targetArmyId ===
    null
  ) {
    return;
  }

  state = {
    ...state,

    targetArmyId:
      null,
  };

  emit();
}

export function selectMapSettlement(
  settlementId:
    string | null
): void {
  state = {
    ...state,

    selectedSettlementId:
      settlementId,

    selectedStrategicNodeId:
      null,

    targetArmyId:
      null,
  };

  emit();
}

export function selectMapStrategicNode(
  nodeId:
    string | null
): void {
  state = {
    ...state,

    selectedStrategicNodeId:
      nodeId,

    selectedSettlementId:
      null,

    targetArmyId:
      null,
  };

  emit();
}

export function chooseMapDestination(
  settlementId:
    string | null,
  nodeId?:
    string | null
): void {
  state = {
    ...state,

    destinationSettlementId:
      settlementId,

    destinationNodeId:
      nodeId ??
      settlementId,

    selectedSettlementId:
      settlementId,

    selectedStrategicNodeId:
      null,

    targetArmyId:
      null,
  };

  emit();
}

export function chooseMapNodeDestination(
  nodeId:
    string | null
): void {
  state = {
    ...state,

    destinationSettlementId:
      null,

    destinationNodeId:
      nodeId,

    selectedStrategicNodeId:
      nodeId,

    selectedSettlementId:
      null,

    targetArmyId:
      null,
  };

  emit();
}

export function beginChangingOrder(
  orderId:
    string
): void {
  state = {
    ...state,

    changingOrderId:
      orderId,

    destinationSettlementId:
      null,

    destinationNodeId:
      null,

    targetArmyId:
      null,
  };

  emit();
}

export function cancelChangingOrder():
  void {
  if (
    state.changingOrderId ===
    null
  ) {
    return;
  }

  state = {
    ...state,

    changingOrderId:
      null,

    destinationSettlementId:
      null,

    destinationNodeId:
      null,
  };

  emit();
}

export function clearMapDestination():
  void {
  if (
    state.destinationNodeId ===
      null &&
    state.destinationSettlementId ===
      null
  ) {
    return;
  }

  state = {
    ...state,

    destinationSettlementId:
      null,

    destinationNodeId:
      null,
  };

  emit();
}

export function clearMapSelection():
  void {
  state = {
    selectedArmyId:
      null,

    targetArmyId:
      null,

    selectedSettlementId:
      null,

    selectedStrategicNodeId:
      null,

    destinationSettlementId:
      null,

    destinationNodeId:
      null,

    changingOrderId:
      null,
  };

  emit();
}
