export type WorldMinute =
  number;

export type Position =
  | {
      kind:
        "node";

      nodeId:
        string;
    }
  | {
      kind:
        "edge";

      edgeId:
        string;

      /*
       * Canonical edge orientation:
       *
       * 0 = edge.fromNodeId
       * 1 = edge.toNodeId
       */
      progress:
        number;

      /*
       * Direction in which this entity
       * is travelling relative to the
       * edge's canonical orientation.
       */
      direction:
        | "forward"
        | "backward";
    };

export interface ActiveMovement {
  id:
    string;

  entityId:
    string;

  routeNodeIds:
    string[];

  routeEdgeIds:
    string[];

  /*
   * Index of the edge currently
   * occupied by the entity.
   *
   * This is updated whenever canonical
   * movement positions advance.
   */
  currentEdgeIndex:
    number;

  speedKmPerHour:
    number;

  startedAt:
    WorldMinute;

  estimatedArrivalAt:
    WorldMinute;

  destinationNodeId:
    string;
}

interface ScheduledEventBase {
  id:
    string;

  executeAt:
    WorldMinute;

  sequence:
    number;

  causeEventIds:
    string[];

  sourceActionId?:
    string;
}

export interface SimulationMarkerEvent
  extends ScheduledEventBase {
  type:
    "SIMULATION_MARKER";

  payload: {
    label:
      string;
  };
}

export interface SimulationInterruptEvent
  extends ScheduledEventBase {
  type:
    "SIMULATION_INTERRUPT";

  payload: {
    interruptType:
      string;

    message:
      string;
  };
}

export type ScheduledEvent =
  | SimulationMarkerEvent
  | SimulationInterruptEvent;

export interface ResolvedEvent {
  id:
    string;

  type:
    ScheduledEvent[
      "type"
    ];

  timestamp:
    WorldMinute;

  causeEventIds:
    string[];

  sourceActionId?:
    string;

  result: {
    summary:
      string;
  };
}

export interface SimulationInterrupt {
  eventId:
    string;

  type:
    string;

  message:
    string;

  /*
   * Only these players need to enter
   * a command window because of this
   * interrupt.
   *
   * Undefined means legacy/global
   * simulation interrupt.
   */
  affectedPlayerIds?:
    string[];
}

export interface AdvanceWorldResult {
  reachedTarget:
    boolean;

  currentTime:
    WorldMinute;

  interrupt?:
    SimulationInterrupt;
}