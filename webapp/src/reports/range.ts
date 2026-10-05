export type ReportRow = { date: string; zone: string; trips: string; fare: string };

export function rowsInRange(rows: readonly ReportRow[], from: string, to: string): { rows: ReportRow[]; error?: string } {
  if (!from || !to) return { rows: [], error: "Choose a from date and a to date." };
  if (from > to) return { rows: [], error: "The from date is after the to date." };
  return { rows: rows.filter((row) => row.date >= from && row.date <= to) };
}
