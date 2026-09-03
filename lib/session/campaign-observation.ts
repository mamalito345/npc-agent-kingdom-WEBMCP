import {
  getCampaignStatus,
} from "@/lib/campaign/objectives";

export function inspectPlayerCampaignStatus(
  sessionId:
    string,
  playerId:
    string
) {
  return getCampaignStatus(
    sessionId,
    playerId
  );
}
