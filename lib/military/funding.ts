import type {
  FundingState,
} from "@/types/military";

export function getFundingStateForUnpaidDays(
  unpaidDays: number
): FundingState {
  if (
    unpaidDays >= 7
  ) {
    return "collapse_risk";
  }

  if (
    unpaidDays >= 3
  ) {
    return "arrears";
  }

  if (
    unpaidDays >= 1
  ) {
    return "underfunded";
  }

  return "funded";
}