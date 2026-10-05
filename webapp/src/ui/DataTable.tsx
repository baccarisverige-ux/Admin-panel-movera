import { useMemo, useState, type ReactNode } from "react";

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
  if (typeof cell === "string" || typeof cell === "number") return String(cell);
  return "";
}

function renderCell(value: ReactNode, index: number, row: ReactNode[], head: string[]): ReactNode {
  if (typeof value !== "string") return value;
  const isStatusSlot = index === row.length - 2;
  if (isStatusSlot) {
    const tone = statusTone(value);
    if (tone) return <span className={`status ${tone}`}>{value}</span>;
  }
  if (head[index] === "Actions" && value.includes("|")) {
    return value.split("|").map((label) => (
      <button key={label} type="button" className={label === "Delete" ? "link-action danger-text" : "link-action"}>
        {label}
      </button>
    ));
  }
  return value;
}

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
  const [sortIndex, setSortIndex] = useState(0);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows
      .map((cells, index) => ({ cells, index }))
      .filter((row) => !needle || row.cells.some((cell) => textOf(cell).toLowerCase().includes(needle)));
  }, [query, rows]);
  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const left = textOf(a.cells[sortIndex]);
      const right = textOf(b.cells[sortIndex]);
      return (sortAsc ? 1 : -1) * left.localeCompare(right, "sv");
    });
    return copy;
  }, [filtered, sortAsc, sortIndex]);
  const pageCount = Math.max(1, Math.ceil(sorted.length / 25));
  const safePage = Math.min(page, pageCount - 1);
  const visible = sorted.slice(safePage * 25, safePage * 25 + 25);

  if (state === "loading") return <p className="state-line">Loading.</p>;
  if (state === "error") {
    return (
      <p className="state-line">
        Could not load. <button className="link-action" type="button" onClick={onRetry}>Retry</button>
      </p>
    );
  }

  return (
    <div className="table-wrap">
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
      {visible.length === 0 ? (
        <p className="state-line">Nothing to show.</p>
      ) : (
        <table className={className}>
          <thead>
            <tr>
              {head.map((column, index) => (
                <th key={column}>
                  <button
                    className="link-action"
                    type="button"
                    onClick={() => {
                      setSortAsc(sortIndex === index ? !sortAsc : true);
                      setSortIndex(index);
                    }}
                  >
                    {column}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.index} onClick={onRow ? () => onRow(row.index) : undefined}>
                {row.cells.map((cell, index) => (
                  <td key={`${row.index}-${index}`}>{renderCell(cell, index, row.cells, head)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="state-line">
        {sorted.length} rows · page {safePage + 1} of {pageCount}
        <button className="link-action" type="button" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
          Previous
        </button>
        <button className="link-action" type="button" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>
          Next
        </button>
      </p>
    </div>
  );
}
