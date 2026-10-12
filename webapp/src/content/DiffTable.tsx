/** What a content draft changes against an earlier version, field by field. */
export function DiffTable({ rows }: { rows: readonly { label: string; before: string; after: string }[] }) {
  return (
    <table className="gr-diff" aria-label="Changes">
      <thead><tr><th>Field</th><th>Before</th><th>Draft</th></tr></thead>
      <tbody>{rows.map((row) => <tr key={row.label}><td>{row.label}</td><td className="before">{row.before}</td><td className="after">{row.after}</td></tr>)}</tbody>
    </table>
  );
}
