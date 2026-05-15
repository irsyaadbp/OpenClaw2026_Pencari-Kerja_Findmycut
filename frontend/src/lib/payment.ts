export type PaymentStatus = "locked" | "checkout" | "unlocked";
export type Tier = "pro" | "platinum";

export function isPreviewLocked(status: PaymentStatus, index: number): boolean {
  if (status === "unlocked") return false;
  return index > 0;
}

export function getTierPrice(tier: Tier): string {
  return tier === "platinum" ? "Rp 25.000" : "Rp 15.000";
}

export function getTierLabel(tier: Tier): string {
  return tier === "platinum" ? "Platinum Pass" : "Pro Pass";
}
