import { useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Permission } from "./domain";
import { statusLabel } from "./format";
import { useAdmin } from "./store";

export function cn(...values: ClassValue[]) {
  return twMerge(clsx(values));
}

export function A({ href, className, children, onClick }: { href: string; className?: string; children: ReactNode; onClick?: () => void }) {
  const navigate = useNavigate();
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        onClick?.();
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        void navigate({ href });
      }}
    >
      {children}
    </a>
  );
}

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "soft" }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40",
        variant === "primary" && "bg-ink text-paper",
        variant === "ghost" && "border border-line bg-paper text-ink",
        variant === "danger" && "bg-bad text-paper",
        variant === "soft" && "bg-canvas text-ink",
        className,
      )}
      {...props}
    />
  );
}

const TONE = {
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
  muted: "text-muted",
} as const;

export function toneOf(status: string): keyof typeof TONE {
  if (["approved", "active", "online", "paid", "captured", "solved", "closed", "completed", "assigned", "submitted", "activated"].includes(status)) return "good";
  if (["in_review", "pending", "pending_approval", "on_hold", "waiting", "expiring", "authorized", "handling", "away", "going_online", "on_trip", "draft"].includes(status)) return "warn";
  if (["rejected", "expired", "suspended", "failed", "blocked", "no_show", "needed", "open"].includes(status) || status.startsWith("cancelled")) return status === "needed" ? "muted" : "bad";
  return "muted";
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const tone = toneOf(status);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium capitalize", TONE[tone])}>
      <span className={cn("size-1.5 rounded-full bg-current")} aria-hidden />
      {label ?? statusLabel(status)}
    </span>
  );
}

export function PageHead({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-2xl border border-line bg-paper p-4", className)}>{children}</section>;
}

export function Guard({ need, children }: { need?: Permission | Permission[]; children: ReactNode }) {
  const { can } = useAdmin();
  const allowed = !need || (Array.isArray(need) ? need.some((item) => can(item)) : can(need));
  if (!allowed) {
    return (
      <Panel>
        <h2 className="text-lg font-semibold">No access</h2>
        <p className="mt-1 text-sm text-muted">This role cannot open this screen. Switch demo agent from the profile menu.</p>
      </Panel>
    );
  }
  return children;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted">
      {label}
      {children}
    </label>
  );
}

export const controlClass = "h-11 rounded-xl border border-line bg-paper px-3 text-sm text-ink";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(controlClass, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(controlClass, props.className)} />;
}

export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40">
      <button className="h-full flex-1" aria-label="Close" onClick={onClose} />
      <aside className="flex h-full w-full max-w-3xl flex-col bg-paper shadow-none">
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h3 className="font-semibold">{title}</h3>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}

export function Confirm({
  title,
  body,
  confirmLabel,
  danger,
  requireReason,
  reasonLabel = "Reason",
  extra,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
  extra?: ReactNode;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
      <form
        className="w-full max-w-md rounded-2xl border border-line bg-paper p-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (requireReason && reason.trim().length < 3) return;
          onConfirm(reason.trim());
        }}
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted">{body}</p>
        {extra}
        {requireReason ? (
          <Field label={reasonLabel}>
            <textarea className={cn(controlClass, "mt-1 min-h-24 py-2")} value={reason} onChange={(event) => setReason(event.target.value)} required />
          </Field>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} type="submit">{confirmLabel}</Button>
        </div>
      </form>
    </div>
  );
}

export function PhonePreview({ kicker, title, body }: { kicker?: string; title: string; body: string }) {
  return (
    <div className="mx-auto w-[250px] rounded-[28px] border border-ink bg-ink p-3 text-paper">
      <div className="mb-8 text-center text-[10px] text-paper/70">09:41</div>
      {kicker ? <p className="mb-2 text-center text-[10px] uppercase tracking-wide text-paper/60">{kicker}</p> : null}
      <div className="rounded-full bg-paper px-3 py-2 text-ink">
        <div className="text-xs font-semibold">{title}</div>
        <div className="text-[11px] leading-snug text-muted">{body}</div>
      </div>
    </div>
  );
}

export function HoldPreview({ message }: { message: string }) {
  return (
    <div className="mx-auto w-[250px] rounded-[28px] border border-ink bg-canvas p-3">
      <div className="mb-10 text-center text-[10px] text-muted">09:41</div>
      <div className="rounded-2xl bg-paper p-3">
        <div className="text-sm font-semibold">Account on hold</div>
        <p className="mt-1 text-xs text-muted">{message || "A message from Movera will appear here."}</p>
      </div>
    </div>
  );
}

type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sort?: (a: T, b: T) => number;
};

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRow,
  search,
  empty,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRow?: (row: T) => void;
  search?: (row: T) => string;
  empty: string;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let next = q && search ? rows.filter((row) => search(row).toLowerCase().includes(q)) : rows;
    const column = columns.find((item) => item.key === sortKey && item.sort);
    if (column?.sort) next = [...next].sort((a, b) => column.sort!(a, b) * dir);
    return next;
  }, [rows, query, search, columns, sortKey, dir]);
  const size = 25;
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const view = filtered.slice(page * size, page * size + size);
  return (
    <div>
      {search ? (
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
          placeholder="Search"
          className={cn(controlClass, "mb-3 w-full max-w-xs")}
          aria-label="Search"
        />
      ) : null}
      <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="sticky top-0 bg-paper text-xs text-muted">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="border-b border-line px-3 py-3 font-medium">
                  {column.sort ? (
                    <button
                      className="underline-offset-2 hover:underline"
                      onClick={() => {
                        setDir(sortKey === column.key && dir === 1 ? -1 : 1);
                        setSortKey(column.key);
                      }}
                    >
                      {column.header}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-muted">{empty}</td>
              </tr>
            ) : (
              view.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={cn("border-b border-line last:border-0", onRow && "cursor-pointer hover:bg-canvas")}
                  onClick={onRow ? () => onRow(row) : undefined}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-3 py-3 align-middle">{column.render(row)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>{filtered.length} records</span>
        <div className="flex gap-2">
          <Button variant="ghost" className="h-9" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</Button>
          <span className="grid place-items-center">{page + 1} / {pages}</span>
          <Button variant="ghost" className="h-9" disabled={page + 1 >= pages} onClick={() => setPage((value) => value + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}

export function Boot() {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas text-ink">
      <div className="text-center">
        <div className="mx-auto grid size-11 place-items-center rounded-2xl bg-ink text-sm font-semibold text-paper">M</div>
        <p className="mt-3 text-sm text-muted">Movera Admin</p>
      </div>
    </div>
  );
}

export function Toasts() {
  const { toasts } = useAdmin();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(100%-2rem,320px)] flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className={cn("rounded-2xl border border-line bg-paper px-3 py-2 text-sm shadow-none", toast.tone === "err" && "border-bad")}>
          {toast.text}
        </div>
      ))}
    </div>
  );
}
