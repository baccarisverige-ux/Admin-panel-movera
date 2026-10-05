export type Referral = { code: string; ownerId: string; uses: number; cap: number };

export function redeemReferral(referral: Referral, riderId: string): { referral: Referral; error?: string } {
  if (!riderId.trim()) return { referral, error: "A rider is required." };
  if (riderId === referral.ownerId) return { referral, error: "You cannot use your own code." };
  if (referral.uses >= referral.cap) return { referral, error: "This code has reached its cap." };
  return { referral: { ...referral, uses: referral.uses + 1 } };
}
