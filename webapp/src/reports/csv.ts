export function csvCell(value: string): string {
  const trimmed = value.trimStart();
  const guarded = /^[=+\-@]/.test(trimmed) ? `'${value}` : value;
  if (/[",\n]/.test(guarded)) return `"${guarded.replaceAll('"', '""')}"`;
  return guarded;
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}
