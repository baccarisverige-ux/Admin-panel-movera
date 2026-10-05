import { useState, type FormEvent, type ReactNode } from "react";
import { can, type Role } from "../auth/permissions";

export function StatusDot({ tone, children }: { tone: "green" | "amber" | "red" | "muted"; children: ReactNode }) {
  return (
    <span className={`status-dot ${tone}`}>
      <i />
      {children}
    </span>
  );
}

export function Money({ ore }: { ore: number }) {
  return <span>{new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK" }).format(ore / 100)}</span>;
}

export function DateTime({ iso }: { iso: string }) {
  return <time dateTime={iso}>{new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Stockholm" }).format(new Date(iso))}</time>;
}

export function Duration({ seconds }: { seconds: number }) {
  const minutes = Math.floor(seconds / 60);
  return <span>{minutes} min {seconds % 60} s</span>;
}

export function EmptyState({ title }: { title: string }) {
  return <p className="state-line">{title}</p>;
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <p className="state-line">
      Something failed. <button className="link-action" type="button" onClick={onRetry}>Retry</button>
    </p>
  );
}

export function NoAccess() {
  return (
    <div className="page-heading">
      <div>
        <h2>No access</h2>
        <p>Your role cannot open this page.</p>
      </div>
    </div>
  );
}

export function Can({ role, permission, children }: { role: Role; permission: string; children: ReactNode }) {
  if (!can(role, permission)) return null;
  return children;
}

export function Timeline({ items }: { items: { at: string; text: string }[] }) {
  return (
    <ol className="timeline">
      {items.map((item) => (
        <li key={item.at}>
          <DateTime iso={item.at} /> {item.text}
        </li>
      ))}
    </ol>
  );
}

export function PhonePreview({ app, children }: { app: "rider" | "driver"; children: ReactNode }) {
  return (
    <div className={`phone-preview ${app}`}>
      <strong>{app === "rider" ? "Rider" : "Driver"}</strong>
      <div>{children}</div>
    </div>
  );
}

export function DiffView({ before, after }: { before: string; after: string }) {
  return (
    <div className="diff-view">
      <p>Before: {before}</p>
      <p>After: {after}</p>
    </div>
  );
}

export function Toast({ text }: { text: string }) {
  return <p className="toast">{text}</p>;
}

export function Drawer({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <aside className="drawer" role="dialog" aria-label={title}>
      <button className="link-action" type="button" onClick={onClose}>Close</button>
      <h3>{title}</h3>
      {children}
    </aside>
  );
}

export function DetailLayout({ title, status, actions, tabs, children }: { title: string; status: ReactNode; actions: ReactNode; tabs: ReactNode; children: ReactNode }) {
  return (
    <article className="panel">
      <header className="detail-head">
        <h2>{title}</h2>
        {status}
        {actions}
      </header>
      {tabs}
      {children}
    </article>
  );
}

export function DocumentViewer() {
  const [turn, setTurn] = useState(0);
  return (
    <div className="doc-viewer">
      <p>Document preview. Rotate {turn * 90} degrees.</p>
      <button className="secondary-btn" type="button" onClick={() => setTurn((value) => value + 1)}>Rotate</button>
    </div>
  );
}

export function ConfirmDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [reason, setReason] = useState("Safety");
  if (!open) return null;
  function submit(event: FormEvent) {
    event.preventDefault();
    onClose();
  }
  return (
    <div className="modal open" role="presentation">
      <form className="modal-card" role="dialog" aria-modal="true" aria-label="Confirm" onSubmit={submit}>
        <h3>Confirm</h3>
        <label>
          Reason
          <select value={reason} onChange={(event) => setReason(event.target.value)}>
            <option>Safety</option>
            <option>Other</option>
          </select>
        </label>
        <button className="primary-btn" type="submit">Confirm</button>
        <button className="secondary-btn" type="button" onClick={onClose}>Cancel</button>
      </form>
    </div>
  );
}

export function useDirty(initial: string) {
  const [value, setValue] = useState(initial);
  return { value, setValue, dirty: value !== initial };
}
