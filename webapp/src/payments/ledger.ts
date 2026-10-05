const BANKS: Record<string, string> = {
  "3000": "Nordea",
  "5000": "SEB",
  "6000": "Handelsbanken",
  "8000": "Swedbank",
  "9022": "Länsförsäkringar",
};

export function clearingBank(clearing: string): string | null {
  return BANKS[clearing] ?? null;
}

export function accountOk(account: string): boolean {
  return /^\d{6,10}$/.test(account);
}

export function bicOk(bic: string): boolean {
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic);
}

export function ibanOk(iban: string): boolean {
  const compact = iban.replace(/\s/g, "").toUpperCase();
  if (!/^SE\d{22}$/.test(compact)) return false;
  const rearranged = compact.slice(4) + compact.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (char) => String(char.charCodeAt(0) - 55));
  let rest = 0;
  for (const char of numeric) rest = (rest * 10 + Number(char)) % 97;
  return rest === 1;
}

export function paymentTimeline(status: string): string[] {
  if (status === "failed") return ["Pending", "Failed"];
  if (status === "refunded") return ["Pending", "Authorized", "Captured", "Refunded"];
  if (status === "authorized") return ["Pending", "Authorized"];
  if (status === "pending") return ["Pending"];
  return ["Pending", "Authorized", "Captured"];
}

export function refundRows<T extends { id: string; status: string }>(rows: readonly T[], id: string): T[] {
  return rows.filter((row) => row.id === id && row.status === "refunded");
}
