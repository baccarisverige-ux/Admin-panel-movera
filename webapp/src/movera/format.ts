import type { BankAccount } from "./domain";

const sek = new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK" });
const stamp = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Stockholm",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatSek(ore: number): string {
  return sek.format(ore / 100);
}

export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function formatWhen(iso: string): string {
  return stamp.format(new Date(iso)).replace(",", "");
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return "••••";
  return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ••• ${digits.slice(-4)}`;
}

export function maskPersonnummer(value: string): string {
  const tail = value.replace(/\D/g, "").slice(-4);
  return `••••••-${tail}`;
}

export function maskAccount(value: string): string {
  const digits = value.replace(/\s/g, "");
  return `•••• ${digits.slice(-4)}`;
}

export function ibanMod97(iban: string): boolean {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rest = 0;
  for (const ch of numeric) rest = (rest * 10 + Number(ch)) % 97;
  return rest === 1;
}

export function validateBank(bank: BankAccount): string | null {
  if (bank.kind === "se") {
    const clearing = bank.clearing ?? "";
    const account = bank.account ?? "";
    if (!/^\d{4,5}$/.test(clearing)) return "Clearing number must be 4 digits, or 5 for Swedbank.";
    if (clearing.startsWith("8") && clearing.length !== 5) return "Swedbank clearing numbers are 5 digits and start with 8.";
    if (!clearing.startsWith("8") && clearing.length !== 4) return "Clearing numbers are 4 digits, except Swedbank.";
    if (!/^\d{6,10}$/.test(account)) return "Account number must be 6–10 digits.";
    return null;
  }
  const iban = (bank.iban ?? "").replace(/\s/g, "").toUpperCase();
  if (!/^SE\d{22}$/.test(iban)) return "A Swedish IBAN is 24 characters.";
  if (!ibanMod97(iban)) return "IBAN check digits are not valid.";
  if (!/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bank.bic ?? "")) return "BIC must be 8 or 11 characters.";
  return null;
}

export function validatePlate(plate: string): string | null {
  return /^[A-Z]{3}\s\d{3}$/.test(plate.trim().toUpperCase()) ? null : "Use a Swedish plate like MVR 418.";
}

export function validateVehicleYear(year: number): string | null {
  if (year < 2000 || year > 2027) return "Year must be from 2000 through 2027.";
  return null;
}

export function validateSeats(seats: number): string | null {
  if (seats < 1 || seats > 8) return "Seats must be between 1 and 8.";
  return null;
}

export function hoursAgo(fromIso: string, atIso: string): number {
  return (new Date(fromIso).getTime() - new Date(atIso).getTime()) / 36e5;
}

export function statusLabel(value: string): string {
  return value.replaceAll("_", " ");
}
