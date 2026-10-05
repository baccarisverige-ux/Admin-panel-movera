import type { ReactNode } from "react";
import type { TableData } from "../data/catalog";

const STATUS_WORDS = /Active|Complete|Pending|CRITICAL|HIGH|Expired|Operational|In Progress/;

export type StatusTone = "active" | "danger" | "warning" | "inactive";

export function statusTone(value: string): StatusTone | null {
  if (value === "Inactive") return "inactive";
  if (!STATUS_WORDS.test(value)) return null;
  if (/Active|Complete|Operational/.test(value)) return "active";
  if (/CRITICAL|Expired/.test(value)) return "danger";
  return "warning";
}

type DataTableProps = TableData & {
  className?: string;
};

function renderCell(value: string, index: number, row: string[], head: string[]): ReactNode {
  const isStatusSlot = index === row.length - 2;
  if (isStatusSlot) {
    const tone = statusTone(value);
    if (tone) {
      return <span className={`status ${tone}`}>{value}</span>;
    }
  }

  if (head[index] === "Actions" && value.includes("|")) {
    return value.split("|").map((label) => (
      <button
        key={label}
        type="button"
        className={label === "Delete" ? "link-action danger-text" : "link-action"}
      >
        {label}
      </button>
    ));
  }

  return value;
}

export function DataTable({ head, rows, className }: DataTableProps) {
  return (
    <div className="table-wrap">
      <table className={className}>
        <thead>
          <tr>
            {head.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("|")}>
              {row.map((cell, index) => (
                <td key={`${head[index]}-${index}`}>{renderCell(cell, index, row, head)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
