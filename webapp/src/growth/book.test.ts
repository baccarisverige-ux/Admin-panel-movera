import { averageStars, applyPromo, BONUSES, hideReview } from "./book.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

const promo = { id: "RIDENOW", budgetOre: 8000, spentOre: 2000, stacks: false };
assert(applyPromo(promo, 12000, true).error?.includes("stack"), "no stacking");
assert(applyPromo(promo, 12000, false).discountOre === 5000, "discount inside the budget");
assert(applyPromo({ ...promo, spentOre: 7000 }, 12000, false).error?.includes("Budget"), "budget stops it");
assert(BONUSES.map((bonus) => bonus.id).join() === "ARN120,EVE60,PEAK80", "named bonuses");
const reviews = [
  { id: "V1", stars: 5, text: "Great", hidden: false, hideReason: null },
  { id: "V2", stars: 1, text: "Late", hidden: false, hideReason: null },
];
const hidden = hideReview(reviews[1]!, "Abuse");
assert(hidden.review.text === "Late" && hidden.review.hidden, "original text kept");
assert(averageStars([reviews[0]!, hidden.review]) === 5, "hidden review leaves the average");

console.log("growth ok");
