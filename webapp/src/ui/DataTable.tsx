import { useMemo, useState, type ReactNode } from "react";
import { getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table";
import { statusLabel } from "../domain/labels";
import { toCsv } from "../reports/csv";
import { StatusDot } from "./kit";
import { CommandButton } from "./CommandButton";

const STATUS_WORDS = /Active|Complete|Pending|CRITICAL|HIGH|Expired|Operational|In Progress/;

export type StatusTone = "active" | "danger" | "warning" | "inactive";

export function statusTone(value: string): StatusTone | null {
  if (value === "Inactive") return "inactive";
  if (!STATUS_WORDS.test(value)) return null;
  if (/Active|Complete|Operational/.test(value)) return "active";
  if (/CRITICAL|Expired/.test(value)) return "danger";
  return "warning";
}

function textOf(cell: ReactNode): string {
  if (typeof cell === "string" || typeof cell === "number") return statusLabel(String(cell));
  return "";
}

function renderCell(value: ReactNode): ReactNode {
  if (typeof value !== "string" && typeof value !== "number") return value;
  const raw = String(value);
  const label = statusLabel(raw);
  if (label !== raw || /Active|Complete|Pending|Expired|Approved|Rejected|On a trip/.test(label)) {
    const tone = statusTone(raw);
    const dot = tone === "active" ? "green" : tone === "danger" ? "red" : tone === "warning" ? "amber" : label === "On a trip" || label === "Active" || label === "Approved" ? "green" : "muted";
    if (label !== raw || tone) return <StatusDot tone={dot}>{label}</StatusDot>;
  }
  return label;
}

type Row = { id: string; cells: ReactNode[]; text: string[] };

type DataTableProps = {
  head: string[];
  rows: ReactNode[][];
  className?: string;
  state?: "ready" | "loading" | "error";
  onRetry?: () => void;
  onRow?: (index: number) => void;
};

export function DataTable({ head, rows, className, state = "ready", onRetry, onRow }: DataTableProps) {
  const [query, setQuery] = useState("");
  const [chips, setChips] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [menu, setMenu] = useState<number | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const data = useMemo<Row[]>(() => {
    const needles = [query.trim().toLowerCase(), ...chips.map((chip) => chip.toLowerCase())].filter(Boolean);
    return rows
      .map((cells, index) => ({ id: String(index), cells, text: cells.map((cell) => textOf(cell)) }))
      .filter((row) => needles.every((needle) => row.text.some((cell) => cell.toLowerCase().includes(needle))));
  }, [chips, query, rows]);
  const columns = useMemo<ColumnDef<Row>[]>(
    () => head.map((column, index) => ({ id: column, header: column, accessorFn: (row) => row.text[index] ?? "" })),
    [head],
  );
  const table = useReactTable({ data, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });
  const sorted = table.getRowModel().rows;
  const pageCount = Math.max(1, Math.ceil(sorted.length / 25));
  const safePage = Math.min(page, pageCount - 1);
  const visible = sorted.slice(safePage * 25, safePage * 25 + 25);
  const csv = toCsv([head, ...data.map((row) => row.text)]);

  if (state === "loading") return <p className="state-line">Loading.</p>;
  if (state === "error") {
    return (
      <p className="state-line">
        Could not load. <CommandButton command="admin.table.retry" className="link-action" type="button" onDone={onRetry}>Retry</CommandButton>
      </p>
    );
  }

  return (
    <div className="table-wrap">
      <div className="actions">
        <input
          className="table-search"
          value={query}
          placeholder="Search"
          aria-label="Search this table"
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
        />
        <CommandButton command="admin.table.filter" className="secondary-btn" type="button" onDone={() => { if (query.trim()) { setChips((current) => [...current, query.trim()]); setQuery(""); } }}>Add filter</CommandButton>
        <a className="secondary-btn" href={`data:text/csv,${encodeURIComponent(csv)}`} download="movera.csv">Export CSV</a>
      </div>
      <div className="actions">
        {chips.map((chip) => (
          <CommandButton command="admin.table.clearFilter" key={chip} className="secondary-btn" type="button" onDone={() => setChips((current) => current.filter((item) => item !== chip))}>{chip} ×</CommandButton>
        ))}
      </div>
      {visible.length === 0 ? <p className="state-line">Nothing to show.</p> : (
        <table className={className}>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id}>
                    <CommandButton command="admin.table.sort" className="link-action" type="button" onDone={() => header.column.getToggleSortingHandler()?.(new MouseEvent("click") as never)}>{String(header.column.columnDef.header)}</CommandButton>
                  </th>
                ))}
                <th>Row</th>
              </tr>
            ))}
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.original.id} onClick={() => onRow?.(Number(row.original.id))}>
                {row.original.cells.map((cell, index) => (
                  <td key={`${row.original.id}-${index}`}>{renderCell(cell)}</td>
                ))}
                <td>
                  <CommandButton command="admin.table.menu" className="link-action" type="button" onDone={() => setMenu(menu === Number(row.original.id) ? null : Number(row.original.id))}>Menu</CommandButton>
                  {menu === Number(row.original.id) ? (
                    <CommandButton command="admin.table.open" className="link-action" type="button" onDone={() => onRow?.(Number(row.original.id))}>Open</CommandButton>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="state-line">
        {sorted.length} rows · page {safePage + 1} of {pageCount}
        <CommandButton command="admin.table.previous" className="link-action" type="button" disabled={safePage === 0} onDone={() => setPage(safePage - 1)}>Previous</CommandButton>
        <CommandButton command="admin.table.next" className="link-action" type="button" disabled={safePage >= pageCount - 1} onDone={() => setPage(safePage + 1)}>Next</CommandButton>
      </p>
    </div>
  );
}
