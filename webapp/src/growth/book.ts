export type Promo = { id: string; budgetOre: number; spentOre: number; stacks: boolean };

export function applyPromo(promo: Promo, fareOre: number, alreadyDiscounted: boolean): { discountOre: number; error?: string } {
  if (alreadyDiscounted && !promo.stacks) return { discountOre: 0, error: "This code does not stack." };
  const discount = Math.min(5000, fareOre);
  if (promo.spentOre + discount > promo.budgetOre) return { discountOre: 0, error: "Budget is used up." };
  return { discountOre: discount };
}

export const BONUSES = [
  { id: "ARN120", rule: "Airport runs" },
  { id: "EVE60", rule: "3 hours online after 18:00" },
  { id: "PEAK80", rule: "8 trips 07:00–09:00 Monday to Friday" },
] as const;

export type Review = { id: string; stars: number; text: string; hidden: boolean; hideReason: string | null };

export function hideReview(review: Review, reason: string): { review: Review; error?: string } {
  if (!reason.trim()) return { review, error: "A reason is required." };
  return { review: { ...review, hidden: true, hideReason: reason, text: review.text } };
}

export function averageStars(reviews: readonly Review[]): number {
  const visible = reviews.filter((review) => !review.hidden);
  if (visible.length === 0) return 0;
  return visible.reduce((sum, review) => sum + review.stars, 0) / visible.length;
}
