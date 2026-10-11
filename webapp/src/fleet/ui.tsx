import { useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, FileText, Send } from "lucide-react";
import type { DocStatus } from "../drivers/gate";
import type { ThreadMessage } from "../drivers/ops";
import { CommandButton } from "../ui/CommandButton";
import { DOC_CHOICES, docHealth, docLabel, type DocHealth, type HealthCount } from "./documents";

export function Avatar({ name, size = 56 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  let hue = 0;
  for (const char of name) hue = (hue * 31 + char.charCodeAt(0)) % 360;
  return (
    <span className="fd-avatar" style={{ width: size, height: size, fontSize: size * 0.36, background: `hsl(${hue} 55% 92%)`, color: `hsl(${hue} 45% 32%)` }} aria-hidden="true">
      {initials || "?"}
    </span>
  );
}

const HEALTH_LABEL: Record<DocHealth, string> = { valid: "valid", expiring: "expiring", invalid: "missing or wrong", review: "waiting review" };

export function HealthPill({ health, children }: { health: DocHealth; children: ReactNode }) {
  return <span className={`fd-health h-${health}`}><i aria-hidden="true" />{children}</span>;
}

/** Compact green / orange / red counters for a set of documents. */
export function DocSummary({ counts, total }: { counts: HealthCount; total: number }) {
  return (
    <span className="fd-docsum" title={`${counts.valid} valid, ${counts.expiring} expiring, ${counts.invalid} missing or wrong, ${counts.review} waiting review`}>
      <span className="h-valid"><i aria-hidden="true" />{counts.valid}/{total}</span>
      {counts.expiring ? <span className="h-expiring"><i aria-hidden="true" />{counts.expiring}</span> : null}
      {counts.invalid ? <span className="h-invalid"><i aria-hidden="true" />{counts.invalid}</span> : null}
      {counts.review ? <span className="h-review"><i aria-hidden="true" />{counts.review}</span> : null}
      <span className="sr-only">{(["valid", "expiring", "invalid", "review"] as const).map((key) => `${counts[key]} ${HEALTH_LABEL[key]}`).join(", ")}</span>
    </span>
  );
}

export function AccountChip({ status }: { status: string }) {
  const label = status === "on_hold" ? "On hold" : status.charAt(0).toUpperCase() + status.slice(1).replaceAll("_", " ");
  return <span className={`fd-account a-${status}`}><i aria-hidden="true" />{label}</span>;
}

export function Stat({ label, value, delta, inverse = false, warn = null, hint }: { label: string; value: string; delta?: number | null; inverse?: boolean; warn?: "red" | "amber" | null; hint?: string }) {
  const up = (delta ?? 0) >= 0;
  const good = inverse ? !up : up;
  return (
    <div className={warn ? `fd-stat warn-${warn}` : "fd-stat"}>
      <span className="fd-stat-label">{label}</span>
      <strong className="fd-stat-value">{value}</strong>
      <span className="fd-stat-foot">
        {delta === undefined ? null : delta === null || !Number.isFinite(delta) ? <span className="delta flat">No comparison</span> : (
          <span className={good ? "delta good" : "delta bad"}>
            {up ? <ArrowUpRight size={13} aria-hidden="true" /> : <ArrowDownRight size={13} aria-hidden="true" />}
            {up ? "+" : "−"}{Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {hint ? <small>{hint}</small> : null}
      </span>
    </div>
  );
}

export type DocRow = { id: string; status: DocStatus; expiresAt: string; fileName: string; reviewerId: string; note: string; exempt?: boolean };

export type DocSave = {
  command: string;
  before: string;
  after: string;
  value: unknown;
  needsReason: boolean;
};

type DocumentsProps = {
  label: string;
  rows: DocRow[];
  nowMs: number;
  canEdit: boolean;
  targetId: string;
  scope: string;
  sliceKey: string;
  expectedSliceRev: number;
  /** Build the command for saving a document with the chosen status, expiry date and note. */
  build: (row: DocRow, draft: { status: DocStatus; expiresAt: string; note: string }) => DocSave | null;
  onSaved: (message: string) => void;
};

/** One row per document: colour, status picker, expiry date and note, saved on its own. */
export function DocumentsTable(props: DocumentsProps) {
  return (
    <ul className="fd-docs" aria-label={props.label}>
      {props.rows.map((row) => <DocumentRow key={`${row.id}-${row.status}-${row.expiresAt}-${row.note}`} row={row} {...props} />)}
    </ul>
  );
}

function DocumentRow({ row, nowMs, canEdit, targetId, scope, sliceKey, expectedSliceRev, build, onSaved }: DocumentsProps & { row: DocRow }) {
  const [status, setStatus] = useState<DocStatus>(row.status);
  const [expiresAt, setExpiresAt] = useState(row.expiresAt);
  const [note, setNote] = useState(row.note);
  const shown = docHealth({ status, expiresAt }, nowMs);
  const saved = docHealth(row, nowMs);
  const changed = status !== row.status || expiresAt !== row.expiresAt || note.trim() !== row.note;
  const save = changed ? build(row, { status, expiresAt, note }) : null;
  const name = docLabel(row.id);

  if (row.exempt) {
    return (
      <li className="fd-doc exempt" data-testid={`doc-${row.id}`}>
        <span className="fd-doc-icon"><FileText size={18} aria-hidden="true" /></span>
        <div className="fd-doc-main"><strong>{name}</strong><small>Provided by the fleet</small></div>
        <HealthPill health="valid">Not needed</HealthPill>
      </li>
    );
  }

  return (
    <li className={`fd-doc doc-${saved.health}`} data-testid={`doc-${row.id}`}>
      <span className="fd-doc-icon"><FileText size={18} aria-hidden="true" /></span>
      <div className="fd-doc-main">
        <strong>{name}</strong>
        <small>{row.fileName}{row.reviewerId ? ` · reviewed by ${row.reviewerId}` : " · not reviewed"}{row.note ? ` · ${row.note}` : ""}</small>
      </div>
      <HealthPill health={shown.health}>{shown.label}</HealthPill>
      <label className="fd-doc-field">
        <span>Status</span>
        <select aria-label={`${name} status`} value={status} disabled={!canEdit} onChange={(event) => setStatus(event.target.value as DocStatus)}>
          {DOC_CHOICES.map((choice) => <option key={choice.status} value={choice.status}>{choice.label}</option>)}
        </select>
      </label>
      <label className="fd-doc-field">
        <span>Expires</span>
        <input type="date" aria-label={`${name} expiry date`} value={expiresAt} disabled={!canEdit} onChange={(event) => setExpiresAt(event.target.value)} />
      </label>
      {status === "rejected" || status === "needed" || note ? (
        <label className="fd-doc-field wide">
          <span>Note to the {sliceKey === "driverOps" ? "driver" : "owner"}</span>
          <input aria-label={`${name} note`} value={note} disabled={!canEdit} placeholder={status === "rejected" ? "What is wrong?" : "What is needed?"} onChange={(event) => setNote(event.target.value)} />
        </label>
      ) : null}
      <div className="fd-doc-actions">
        {save ? (
          <CommandButton
            command={save.command}
            className="dash-btn small"
            type="button"
            targetId={targetId}
            confirmTarget={false}
            scope={scope}
            before={save.before}
            after={save.after}
            expectedSliceRev={expectedSliceRev}
            sliceKey={sliceKey}
            value={save.value}
            aria-label={`Save ${name}`}
            onDone={() => onSaved(`${name} saved: ${docHealth({ status, expiresAt }, nowMs).label}.`)}
          >
            Save
          </CommandButton>
        ) : null}
      </div>
    </li>
  );
}

type MessagesProps = {
  messages: ThreadMessage[];
  contactName: string;
  command: string;
  targetId: string;
  scope: string;
  sliceKey: string;
  expectedSliceRev: number;
  build: (text: string) => unknown;
  templates: string[];
  onSent: () => void;
  locale: string;
  timeZone: string;
};

export function MessagesPanel({ messages, contactName, command, targetId, scope, sliceKey, expectedSliceRev, build, templates, onSent, locale, timeZone }: MessagesProps) {
  const [draft, setDraft] = useState("");
  const format = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", hourCycle: "h23", timeZone });
  return (
    <div className="fd-thread">
      <div className="fd-thread-log" aria-label={`Messages with ${contactName}`}>
        {messages.length === 0 ? <p className="state-line">No messages yet. Write the first one below.</p> : messages.map((message, index) => (
          <div key={`${message.at}-${index}`} className={`fd-bubble ${message.from}`}>
            <p>{message.text}</p>
            <small>{message.from === "admin" ? `Movera · ${message.by}` : contactName} · {format.format(Date.parse(message.at))}</small>
          </div>
        ))}
      </div>
      <div className="fd-templates" role="group" aria-label="Message templates">
        {templates.map((text) => <button key={text} type="button" data-command="admin.ui.quickAction" className="fd-template" onClick={() => setDraft(text)}>{text}</button>)}
      </div>
      <div className="fd-compose">
        <label className="sr-only" htmlFor={`compose-${targetId}`}>Message</label>
        <textarea id={`compose-${targetId}`} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Write to ${contactName}`} rows={2} />
        <CommandButton
          command={command}
          className="dash-btn"
          type="button"
          targetId={targetId}
          confirmTarget={false}
          scope={scope}
          before="thread"
          after="message sent"
          expectedSliceRev={expectedSliceRev}
          sliceKey={sliceKey}
          value={build(draft)}
          disabled={!draft.trim()}
          onDone={() => {
            setDraft("");
            onSent();
          }}
        >
          <Send size={15} aria-hidden="true" /> Send
        </CommandButton>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="fd-field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
