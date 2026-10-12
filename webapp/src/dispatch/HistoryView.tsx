import { CheckCircle2, Clock, History, ShieldCheck, Undo2, UserCheck, X } from "lucide-react";
import type { Market } from "../markets/markets";
import { zoneById } from "../markets/markets";
import { CommandButton } from "../ui/CommandButton";
import { zoneResults } from "./demo";
import { approve, decline, DISPATCH_KEY, undoTo, type DispatchBook, type ZoneDispatch } from "./rules";

type Props = {
  book: DispatchBook;
  market: Market;
  agentId: string;
  canEdit: boolean;
  canApprove: boolean;
  rulesOf: (zoneId: string) => ZoneDispatch;
  onNotice: (text: string) => void;
};

/** Waiting approvals at the top, then every published version with undo. */
export function Approvals({ book, agentId, canApprove, onNotice, compact = false }: { book: DispatchBook; agentId: string; canApprove: boolean; onNotice: (text: string) => void; compact?: boolean }) {
  if (!book.approvals.length) return null;
  const at = new Date().toISOString();
  return (
    <section className={compact ? "dx-approvals compact" : "dx-approvals"} aria-label="Waiting for a second admin">
      <h3><ShieldCheck size={15} aria-hidden="true" /> Waiting for a second admin <span className="dx-count">{book.approvals.length}</span></h3>
      <ul>
        {book.approvals.map((item) => {
          const result = approve(book, item.id, agentId, at);
          const mine = item.by === agentId;
          return (
            <li key={item.id}>
              <span className="dx-approval-text">
                <b>{item.kind === "control" ? "Live switch" : "Rules change"} by {item.by}</b>
                <small>{item.lines.slice(0, 3).join(" · ")}{item.lines.length > 3 ? ` · +${item.lines.length - 3} more` : ""}</small>
              </span>
              <span className="dx-approval-actions">
                <CommandButton command="admin.dispatch.approve" className="dash-btn small" targetId={item.id} confirmTarget={false} scope={item.zoneIds.length === 1 ? item.zoneIds[0] : "all"} before="waiting" after="approved" expectedSliceRev={book.draftRev} sliceKey={DISPATCH_KEY} value={result.book} disabled={!canApprove || mine || Boolean(result.error)} title={mine ? "A second admin must approve. You asked for this change." : undefined} onDone={() => onNotice(`Approved: ${item.lines[0]}`)}>
                  <CheckCircle2 size={13} aria-hidden="true" /> Approve
                </CommandButton>
                <CommandButton command="admin.dispatch.decline" className="dash-btn small ghost" targetId={item.id} confirmTarget={false} scope={item.zoneIds.length === 1 ? item.zoneIds[0] : "all"} before="waiting" after="turned down" expectedSliceRev={book.draftRev} sliceKey={DISPATCH_KEY} value={decline(book, item.id)} disabled={!canApprove && !mine} onDone={() => onNotice(mine ? "Your change was taken back." : `Turned down: ${item.lines[0]}`)}>
                  <X size={13} aria-hidden="true" /> {mine ? "Take back" : "Turn down"}
                </CommandButton>
              </span>
              {mine ? <small className="dx-approval-note"><UserCheck size={11} aria-hidden="true" /> Ask another admin with approval rights to approve it.</small> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function HistoryView({ book, market, agentId, canEdit, canApprove, rulesOf, onNotice }: Props) {
  const time = (iso: string) => new Intl.DateTimeFormat(market.locale, { timeZone: market.timeZone, dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  const versions = book.versions.filter((version) => !version.zoneIds.length || version.zoneIds.some((id) => market.zones.some((zone) => zone.id === id)));
  const now = new Date().toISOString();
  return (
    <div className="dx-history">
      <Approvals book={book} agentId={agentId} canApprove={canApprove} onNotice={onNotice} />
      <section className="dash-card" aria-labelledby="dx-history-title">
        <div className="card-head"><h3 id="dx-history-title"><History size={16} aria-hidden="true" /> Published versions</h3></div>
        {versions.length === 0 ? <p className="dx-calm">Nothing published yet. Every publish shows here, and you can undo it.</p> : (
          <ol className="dx-versions" aria-label="Versions">
            {versions.map((version, index) => {
              const undo = undoTo(book, version.rev, agentId, now);
              const zoneId = version.zoneIds[0];
              const after = zoneId ? zoneResults(zoneId, version.live[zoneId] ?? rulesOf(zoneId)) : null;
              const previous = zoneId ? book.versions[book.versions.indexOf(version) + 1]?.live[zoneId] : undefined;
              const before = zoneId && previous ? zoneResults(zoneId, previous) : null;
              return (
                <li key={version.rev} className={index === 0 ? "dx-version latest" : "dx-version"}>
                  <span className="dx-version-head">
                    <b>Version {version.rev}</b>
                    {index === 0 ? <span className="dx-tag live">Live</span> : null}
                    <small><Clock size={11} aria-hidden="true" /> {time(version.at)} · by {version.actorId}{version.approvedBy ? ` · approved by ${version.approvedBy}` : ""}</small>
                  </span>
                  {version.note ? <p className="dx-version-note">{version.note}</p> : null}
                  <ul className="dx-version-lines">{version.lines.slice(0, 8).map((line) => <li key={line}>{line}</li>)}{version.lines.length > 8 ? <li>+{version.lines.length - 8} more</li> : null}</ul>
                  {before && after && zoneId ? <p className="dx-compare">{zoneById(zoneId)?.name}: time to find a driver {before.findSec} s → <b>{after.findSec} s</b> · no driver {before.noDriverPct}% → <b>{after.noDriverPct}%</b></p> : null}
                  <CommandButton command="admin.dispatch.undo" className="dash-btn small ghost" targetId={`version ${version.rev}`} confirmTarget={false} scope={version.zoneIds.length === 1 ? version.zoneIds[0] : "all"} before={`version ${version.rev}`} after={`undo as ${book.draftRev + 1}`} expectedSliceRev={book.draftRev} sliceKey={DISPATCH_KEY} value={undo.book} disabled={!canEdit || Boolean(undo.error) || version.note.startsWith("Undo")} onDone={() => onNotice(`Version ${version.rev} undone. The rules from before it are live again.`)}>
                    <Undo2 size={13} aria-hidden="true" /> {index === 0 ? "Undo this version" : "Go back to before this version"}
                  </CommandButton>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
