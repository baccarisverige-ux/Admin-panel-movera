import { useState } from "react";
import { emptySafety, safetyAction, useRecords, useSlice, type SafetyBook } from "../api/hooks";
import { useSession } from "../auth/SessionContext";
import { CommandButton } from "../ui/CommandButton";
export function SafetyPage() {
  const { agent } = useSession(); const rows = useRecords("incidents"); const store = useSlice<SafetyBook>("safetyOps", emptySafety());
  const [selected, select] = useState(""); const [text, setText] = useState(""); const [notice, setNotice] = useState("");
  const row = rows.data?.find(r => r.id === selected) ?? rows.data?.[0];
  const item = row ? store.value.incidents[row.id] : undefined;
  return <><div className="page-heading"><div><h2>Safety</h2><p>Simulation incident command center. Location freshness must be verified before intervention. Raw PINs are never displayed.</p></div></div>
    {rows.error ? <p role="alert">{rows.error.message}</p> : null}
    <p role="status">{notice}</p><p className="state-line">{rows.data?.filter(r => r.status === "queued").length ?? "…"} unclaimed SOS incidents</p>
    <label>Incident<select value={row?.id ?? ""} onChange={e => { select(e.target.value); setText(""); }}>{rows.data?.map(r => <option key={r.id} value={r.id}>{r.id} · {r.zoneId} · {r.status}</option>)}</select></label>
    {row ? <article className="panel"><h3>{row.id} · {row.status}</h3><p>Trip {row.tripId ?? "Unavailable"} · Zone {row.zoneId} · Owner {item?.owner ?? "Unassigned"}</p><p>Location: not supplied by simulation. Contact the participant to verify their location.</p>
    <label>Contact or outcome<textarea value={text} onChange={e => setText(e.target.value)} /></label><div className="actions">
    {(["take", "contact", "resolve"] as const).map(kind => { const prepared = safetyAction(store.value, row, agent?.id ?? "", kind, kind === "take" ? "Responder accepted incident" : text); return <CommandButton key={kind} command={`admin.safety.${kind}`} targetId={row.id} scope={row.zoneId} collection="incidents" patch={{ status: prepared.status }} entityState={row.status} sliceKey="safetyOps" value={prepared.book} expectedSliceRev={store.value.draftRev} confirmTarget={false} disabled={store.loading || Boolean(prepared.error)} title={prepared.error} after={prepared.status} onDone={() => { setText(""); setNotice(`${kind} recorded in simulation.`); }}>{kind === "take" ? "Take" : kind === "contact" ? "Log contact" : "Resolve"}</CommandButton>; })}</div>
    <ol>{item?.events.map((e,i) => <li key={i}>{e.at} · {e.actor} · {e.kind}: {e.text}</li>)}</ol></article> : <p>{rows.isLoading ? "Loading incidents…" : "No incidents in this scope."}</p>}</>;
}
