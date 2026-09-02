import type {
  WorldMinute,
} from "@/types/simulation";

export type CourierStatus =
  | "traveling"
  | "delivered"
  | "failed";

export interface WorldMessage {
  id: string;

  senderId: string;

  recipientId: string;

  content: string;

  createdAt: WorldMinute;

  deliveredAt?: WorldMinute;
}

export interface Courier {
  id: string;

  senderId: string;

  targetId: string;

  messageId: string;

  destinationNodeId: string;

  speedKmPerHour: number;

  status: CourierStatus;

  createdAt: WorldMinute;

  deliveredAt?: WorldMinute;
}