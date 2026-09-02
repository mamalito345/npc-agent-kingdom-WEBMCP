import type {
  WorldMinute,
} from "@/types/simulation";

export type BorderIncidentStatus =
  | "OPEN"
  | "ACKNOWLEDGED";

export interface BorderIncident {
  id: string;
  armyId: string;
  movementId: string;
  orderId?: string;
  fromKingdomId: string;
  toKingdomId: string;
  edgeId: string;
  crossingNodeId?: string;
  occurredAt: WorldMinute;
  status: BorderIncidentStatus;
  relationPenalty: number;
}

export interface BorderRuntimeState {
  incidents: Record<string, BorderIncident>;
}
