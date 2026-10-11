import type { DocStatus } from "../drivers/gate.ts";

/** Colour a document shows: green valid, orange expiring soon, red missing / wrong / expired, blue waiting review. */
export type DocHealth = "valid" | "expiring" | "invalid" | "review";

export const EXPIRY_WARNING_DAYS = 30;

export type DocState = { status: DocStatus; expiresAt: string };

/** What the admin can set a document to, in the order the picker shows them. */
export const DOC_CHOICES: { status: DocStatus; label: string }[] = [
  { status: "approved", label: "Valid" },
  { status: "expiring", label: "Expires soon" },
  { status: "rejected", label: "Wrong" },
  { status: "needed", label: "Missing" },
  { status: "in_review", label: "Waiting review" },
  { status: "expired", label: "Expired" },
];

const DAY = 86_400_000;

export function daysUntil(date: string, nowMs: number): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return Math.floor((Date.parse(`${date}T23:59:59Z`) - nowMs) / DAY);
}

/** The colour follows the chosen status, and the expiry date can only make it worse. */
export function docHealth(doc: DocState, nowMs: number): { health: DocHealth; label: string } {
  const days = daysUntil(doc.expiresAt, nowMs);
  if (doc.status === "needed") return { health: "invalid", label: "Missing" };
  if (doc.status === "rejected") return { health: "invalid", label: "Wrong" };
  if (doc.status === "expired" || (days !== null && days < 0)) return { health: "invalid", label: "Expired" };
  if (doc.status === "in_review") return { health: "review", label: "Waiting review" };
  if (doc.status === "expiring" || (days !== null && days <= EXPIRY_WARNING_DAYS)) {
    return { health: "expiring", label: days === null ? "Expires soon" : `Expires in ${days} day${days === 1 ? "" : "s"}` };
  }
  return { health: "valid", label: "Valid" };
}

export type HealthCount = Record<DocHealth, number>;

export function countHealth(docs: readonly DocState[], nowMs: number): HealthCount {
  const counts: HealthCount = { valid: 0, expiring: 0, invalid: 0, review: 0 };
  for (const doc of docs) counts[docHealth(doc, nowMs).health] += 1;
  return counts;
}

/** Worst colour across a set of documents. */
export function overallHealth(counts: HealthCount): DocHealth {
  if (counts.invalid) return "invalid";
  if (counts.expiring) return "expiring";
  if (counts.review) return "review";
  return "valid";
}

export const DRIVER_DOC_LABELS: Record<string, string> = {
  terms: "Terms accepted",
  virtual_session: "Training session",
  driver_license: "Driving licence",
  profile_photo: "Profile photo",
  company_registration: "Company registration",
  taxi_driver_license: "Taxi driver licence",
  taxi_traffic_permit: "Taxi traffic permit",
  tax_settings: "Tax settings",
  bank_statement: "Bank statement",
  vehicle_registration: "Vehicle registration",
  vehicle_insurance: "Vehicle insurance",
  operator_license: "Operator licence",
  owner_id: "Owner ID",
  fleet_insurance: "Fleet insurance",
};

export function docLabel(id: string): string {
  return DRIVER_DOC_LABELS[id] ?? id.replaceAll("_", " ");
}
