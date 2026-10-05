import { useRef, type ReactNode } from "react";
import { getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { TableData } from "../api/read";

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

type GridRow = { id: string; cells: string[] };

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const data: GridRow[] = rows.map((row, index) => ({
    id: `${index}-${row.join("|")}`,
    cells: row,
  }));
  const columns: ColumnDef<GridRow>[] = head.map((column, index) => ({
    id: `${column}-${index}`,
    header: column,
    accessorFn: (row) => row.cells[index] ?? "",
  }));
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 36,
  });

  return (
    <div className="table-wrap" ref={scrollRef} data-virtual-size={virtualizer.getTotalSize()}>
      <table className={className}>
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th key={header.id}>{String(header.column.columnDef.header)}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell, index) => (
                <td key={cell.id}>{renderCell(String(cell.getValue()), index, row.original.cells, head)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
