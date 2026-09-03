import type {
  WorldMinute,
} from "@/types/simulation";

export interface Relationship {
  fromCharacterId:
    string;
  toCharacterId:
    string;
  value:
    number;
}

export type AgreementType =
  | "ALLIANCE"
  | "NON_AGGRESSION"
  | "MILITARY_ACCESS"
  | "MILITARY_SUPPORT"
  | "PEACE";

export type AgreementStatus =
  | "PROPOSED"
  | "ACTIVE"
  | "REJECTED"
  | "BROKEN"
  | "EXPIRED";

export interface Agreement {
  id:
    string;
  type:
    AgreementType;
  partyKingdomIds:
    string[];
  proposedByPlayerId:
    string;
  proposedToPlayerId:
    string;
  createdAt:
    WorldMinute;
  status:
    AgreementStatus;
  terms?:
    string;
  expiresAt?:
    WorldMinute;
  secret?:
    boolean;
  proposalMessageId?:
    string;
  deliveredAt?:
    WorldMinute;
  respondedAt?:
    WorldMinute;
  responsePlayerId?:
    string;
  linkedWarId?:
    string;
}

export type PromiseStatus =
  | "ACTIVE"
  | "FULFILLED"
  | "BROKEN"
  | "CANCELLED";

export interface PoliticalPromise {
  id:
    string;
  promisorCharacterId:
    string;
  promiseeCharacterId:
    string;
  summary:
    string;
  targetId?:
    string;
  createdAt:
    WorldMinute;
  status:
    PromiseStatus;
  resolvedAt?:
    WorldMinute;
}

export type AudienceRequestKind =
  | "TAX_RELIEF"
  | "MILITARY_LEVY"
  | "LAND_DISPUTE"
  | "COURT_OFFICE";

export type AudienceRequestStatus =
  | "REQUESTED"
  | "PRESENTED"
  | "ACCEPTED"
  | "REFUSED"
  | "DEFERRED";

export type AudienceResponse =
  | "ACCEPT"
  | "REFUSE"
  | "DEFER";

export type CouncilRecommendation =
  | "SUPPORT"
  | "OPPOSE"
  | "DIVIDED";

export interface AudienceCouncilAdvice {
  convenedAt:
    WorldMinute;
  support:
    number;
  oppose:
    number;
  abstain:
    number;
  recommendation:
    CouncilRecommendation;
  summary:
    string;
}

export interface AudienceRequest {
  id:
    string;

  playerId:
    string;

  petitionerCharacterId:
    string;

  kingdomId:
    string;

  kind:
    AudienceRequestKind;

  title:
    string;

  petition:
    string;

  createdAt:
    WorldMinute;

  status:
    AudienceRequestStatus;

  presentedAt?:
    WorldMinute;

  respondedAt?:
    WorldMinute;

  deferredUntil?:
    WorldMinute;

  councilAdvice?:
    AudienceCouncilAdvice;

  consequenceSummary?:
    string;

  consequenceAppliedAt?:
    WorldMinute;
}

export interface PoliticsRuntimeState {
  relationships:
    Record<
      string,
      Relationship
    >;

  agreements:
    Record<
      string,
      Agreement
    >;

  promises:
    Record<
      string,
      PoliticalPromise
    >;

  audienceRequests?:
    Record<
      string,
      AudienceRequest
    >;
}

export type DefectionDecision =
  | "REJECT_OFFER"
  | "INFORM_RULER"
  | "NEGOTIATE"
  | "ACCEPT_SECRETLY"
  | "DEFECT";

export interface DefectionEvaluation {
  eligible:
    boolean;
  decision:
    DefectionDecision;
  reasons:
    string[];
}
