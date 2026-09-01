export type WorldMinute = number;

export type Position =
  | {
      kind: "node";
      nodeId: string;
    }
  | {
      kind: "edge";
      edgeId: string;
      progress: number;
      direction: "forward" | "backward";
    };

export interface ActiveMovement {
  id: string;
  entityId: string;

  routeNodeIds: string[];
  routeEdgeIds: string[];

  currentEdgeIndex: number;

  speedKmPerHour: number;

  startedAt: WorldMinute;
  estimatedArrivalAt: WorldMinute;

  destinationNodeId: string;
}

interface ScheduledEventBase {
  id: string;
  executeAt: WorldMinute;
  sequence: number;
  causeEventIds: string[];
  sourceActionId?: string;
}

export interface SimulationMarkerEvent extends ScheduledEventBase {
  type: "SIMULATION_MARKER";

  payload: {
    label: string;
  };
}

export interface SimulationInterruptEvent extends ScheduledEventBase {
  type: "SIMULATION_INTERRUPT";

  payload: {
    interruptType: string;
    message: string;
  };
}

export type ScheduledEvent =
  | SimulationMarkerEvent
  | SimulationInterruptEvent;

export interface ResolvedEvent {
  id: string;
  type: ScheduledEvent["type"];

  timestamp: WorldMinute;

  causeEventIds: string[];
  sourceActionId?: string;

  result: {
    summary: string;
  };
}

export interface SimulationInterrupt {
  eventId: string;
  type: string;
  message: string;
}

export interface AdvanceWorldResult {
  reachedTarget: boolean;
  currentTime: WorldMinute;
  interrupt?: SimulationInterrupt;
}