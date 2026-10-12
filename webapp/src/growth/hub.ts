import type { MarketId } from "../markets/markets.ts";

/**
 * Promotions in one place: rider promotions (made in Riders), driver bonuses (made in Drivers),
 * voucher codes and referral rewards (made here), each with its budget and results.
 * Results are demo values from the id until the backend counts real use.
 */

export const PROMO_OPS_KEY = "promoOps";

export type Voucher = {
  id: string;
  code: string;
  title: string;
  kind: "percent" | "amount";
  value: number;
  /** Major units. */
  budget: number;
  perPerson: number;
  maxUses: number;
  from: string;
  to: string;
  on: boolean;
  country: MarketId;
  createdBy: string;
  createdAt: string;
};

export type Referral = { on: boolean; inviterReward: number; friendReward: number; budget: number; perPerson: number; afterRides: number };

export type PromoOps = { draftRev: number; vouchers: Voucher[]; referral: Record<MarketId, Referral>; autoStop: boolean };

export function emptyPromoOps(): PromoOps {
  return {
    draftRev: 1,
    vouchers: [{ id: "V-SEED-1", code: "AUTUMN15", title: "Autumn rides", kind: "percent", value: 15, budget: 15000, perPerson: 2, maxUses: 800, from: "2026-10-01", to: "2026-11-30", on: true, country: "SE", createdBy: "nora", createdAt: "2026-09-28T09:00:00.000Z" }],
    referral: {
      SE: { on: true, inviterReward: 50, friendReward: 50, budget: 25000, perPerson: 10, afterRides: 1 },
      FR: { on: true, inviterReward: 5, friendReward: 5, budget: 2500, perPerson: 10, afterRides: 1 },
      TN: { on: false, inviterReward: 10, friendReward: 10, budget: 3000, perPerson: 5, afterRides: 2 },
    },
    autoStop: true,
  };
}

export function normalizePromoOps(value: unknown): PromoOps {
  const base = emptyPromoOps();
  if (!value || typeof value !== "object") return base;
  const raw = value as Partial<PromoOps>;
  return { draftRev: typeof raw.draftRev === "number" ? raw.draftRev : 1, vouchers: Array.isArray(raw.vouchers) ? raw.vouchers : base.vouchers, referral: { ...base.referral, ...(raw.referral ?? {}) }, autoStop: raw.autoStop !== false };
}

function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) value = Math.imul(value ^ text.charCodeAt(index), 16777619);
  return value >>> 0;
}

export type HubKind = "rider" | "driver" | "voucher" | "referral";
export type HubItem = {
  id: string;
  kind: HubKind;
  title: string;
  code?: string;
  status: "active" | "paused" | "ended" | "stopped" | "budget";
  budget: number | null;
  cost: number;
  rides: number;
  newRiders: number;
  /** What the rides brought in, major units. */
  revenue: number;
  link: string;
  madeIn: string;
};

/** Demo results: how much was spent, the rides it brought and new riders. Spending never passes the budget. */
export function results(id: string, budget: number | null, avgFare: number): { cost: number; rides: number; newRiders: number; revenue: number } {
  const seed = hash(id);
  const share = 0.2 + (seed % 70) / 100;
  const cost = Math.round((budget ?? 5000) * Math.min(share, 1));
  const rides = Math.max(1, Math.round(cost / Math.max(avgFare * 0.18, 1)));
  return { cost, rides, newRiders: Math.round(rides * (0.1 + ((seed >>> 4) % 25) / 100)), revenue: Math.round(rides * avgFare) };
}

/** Return per currency unit spent: what the rides brought in ÷ what the promotion cost. */
export function returnPer(item: Pick<HubItem, "cost" | "revenue">): number {
  return item.cost > 0 ? Math.round((item.revenue / item.cost) * 10) / 10 : 0;
}

export function statusWithBudget(status: HubItem["status"], cost: number, budget: number | null, autoStop: boolean): HubItem["status"] {
  if (autoStop && budget !== null && cost >= budget && status === "active") return "budget";
  return status;
}

export function voucherError(voucher: Voucher, all: readonly Voucher[]): string | null {
  if (!/^[A-Z0-9]{4,16}$/.test(voucher.code)) return "The code must be 4 to 16 capital letters or digits.";
  if (all.some((item) => item.id !== voucher.id && item.code === voucher.code)) return "That code is already used.";
  if (!voucher.title.trim()) return "Give the voucher a title.";
  if (voucher.value <= 0 || (voucher.kind === "percent" && voucher.value > 100)) return voucher.kind === "percent" ? "The discount must be 1 to 100%." : "The amount must be more than zero.";
  if (voucher.budget <= 0 || voucher.perPerson < 1 || voucher.maxUses < 1) return "Budget, uses per person and total uses must be more than zero.";
  if (voucher.from && voucher.to && voucher.to < voucher.from) return "The end date must come after the start.";
  return null;
}

export function saveVoucher(ops: PromoOps, voucher: Voucher): { ops: PromoOps; error?: string } {
  const error = voucherError(voucher, ops.vouchers);
  if (error) return { ops, error };
  const exists = ops.vouchers.some((item) => item.id === voucher.id);
  return { ops: { ...ops, draftRev: ops.draftRev + 1, vouchers: exists ? ops.vouchers.map((item) => (item.id === voucher.id ? voucher : item)) : [voucher, ...ops.vouchers] } };
}

export function referralError(referral: Referral): string | null {
  if (referral.inviterReward < 0 || referral.friendReward < 0) return "Rewards must be zero or more.";
  if (referral.on && referral.budget <= 0) return "Give the referral programme a budget.";
  if (referral.perPerson < 1 || referral.afterRides < 1) return "Friends per person and rides before the reward must be at least 1.";
  return null;
}

/** Average fare per country, major units, for demo results until rides are counted per promotion. */
export const AVG_FARE: Record<MarketId, number> = { SE: 250, FR: 22, TN: 15 };

type Promo = { id: string; title: string; code: string; status: HubItem["status"]; budget: number | null; country: MarketId };
type Bonus = { id: string; name: string; status: HubItem["status"]; budget: number | null; country: MarketId };

/** Every promotion in a country as one list: rider promotions, driver bonuses, vouchers and invite a friend. */
export function hubItems(input: { promotions: readonly Promo[]; bonuses: readonly Bonus[]; ops: PromoOps; country: MarketId; today: string }): HubItem[] {
  const { ops, country } = input;
  const fare = AVG_FARE[country];
  const make = (base: Omit<HubItem, "cost" | "rides" | "newRiders" | "revenue">): HubItem => {
    const result = results(base.id, base.budget, fare);
    return { ...base, ...result, status: statusWithBudget(base.status, result.cost, base.budget, ops.autoStop) };
  };
  const referral = ops.referral[country];
  return [
    ...input.promotions.filter((item) => item.country === country).map((item) => make({ id: item.id, kind: "rider", title: item.title, code: item.code, status: item.status, budget: item.budget, link: `/riders?view=promotions&country=${country}`, madeIn: "Riders" })),
    ...input.bonuses.filter((item) => item.country === country).map((item) => make({ id: item.id, kind: "driver", title: item.name, status: item.status, budget: item.budget, link: `/drivers?view=bonuses&country=${country}`, madeIn: "Drivers" })),
    ...ops.vouchers.filter((item) => item.country === country).map((item) => make({ id: item.id, kind: "voucher", title: item.title, code: item.code, status: item.on ? (item.to && item.to < input.today ? "ended" : "active") : "paused", budget: item.budget, link: `/promotions?tab=vouchers&country=${country}`, madeIn: "Promotions" })),
    make({ id: `REF-${country}`, kind: "referral", title: "Invite a friend", status: referral.on ? "active" : "paused", budget: referral.budget, link: `/promotions?tab=referral&country=${country}`, madeIn: "Promotions" }),
  ];
}
