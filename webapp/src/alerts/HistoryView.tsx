import { useMemo, useState } from "react";
import { CheckCircle2, Copy, Download, Mail, Repeat, Search, Timer, Trophy } from "lucide-react";
import { useAlertsData } from "./AlertsContext";
import { agentName } from "./AlertActions";
import { LEVEL_ICON } from "./OpenView";
import { historyCsv, historyRows, kindDef, numbers, weeklySummary, type HistoryRow, type Level } from "./engine";

/** Solved alerts with both names, the numbers behind them, a CSV export and a weekly summary for managers. */
export function HistoryView() {
  const data = useAlertsData();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<Level | "all">("all");
  const [notice, setNotice] = useState("");
  const rows = useMemo(() => {
    // SOS are solved in Incidents; their history comes from there, with the same names.
    const sos: HistoryRow[] = Object.entries(data.safety.value.incidents).flatMap(([id, item]) => {
      const take = item.events.find((event) => event.kind === "take");
      const done = [...item.events].reverse().find((event) => event.kind === "resolve");
      if (!done) return [];
      const since = take ? Date.parse(take.at) - 2 * 60_000 : Date.parse(done.at);
      return [{
        id: `sos:${id}`, kind: "sos", level: "critical", title: `SOS ${id}`, zoneId: data.facts.incidents.find((row) => row.id === id)?.zoneId ?? null, since: new Date(since).toISOString(), status: "done", owner: done.actor, events: [],
        takenBy: take?.actor ?? done.actor, solvedBy: done.actor, takeMin: take ? Math.round((Date.parse(take.at) - since) / 60_000) : 0, solveMin: Math.round((Date.parse(done.at) - since) / 60_000), note: done.text, doneAt: done.at,
      }];
    });
    return [...historyRows(data.book), ...sos].sort((a, b) => b.doneAt.localeCompare(a.doneAt));
  }, [data.book, data.safety.value, data.facts.incidents]);
  const shown = rows.filter((row) => (level === "all" || row.level === level) && (!query.trim() || `${row.title} ${row.note} ${agentName(row.solvedBy)} ${agentName(row.takenBy)}`.toLowerCase().includes(query.trim().toLowerCase())));
  const stats = numbers(rows);
  const label = (kind: HistoryRow["kind"]) => kindDef(kind)?.label ?? "Your rule";
  const summary = weeklySummary(rows, data.now, label);
  const time = (iso: string) => new Intl.DateTimeFormat(data.market.locale, { timeZone: data.market.timeZone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

  function exportCsv() {
    const blob = new Blob([historyCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `movera-alerts-${data.market.id}-${new Date(data.now).toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`${rows.length} solved alerts exported.`);
  }

  return (
    <div className="al-history">
      <section className="al-stats" aria-label="Numbers">
        <div><CheckCircle2 size={16} aria-hidden="true" /><span><b>{stats.count}</b><small>Alerts solved</small></span></div>
        <div><Timer size={16} aria-hidden="true" /><span><b>{stats.avgTake} min</b><small>Average time to take</small></span></div>
        <div><Timer size={16} aria-hidden="true" /><span><b>{stats.avgSolve} min</b><small>Average time to solve</small></span></div>
        <div className="warn"><Repeat size={16} aria-hidden="true" /><span><b>{stats.repeats.length}</b><small>Problems that came back</small></span></div>
      </section>

      <div className="al-history-grid">
        <section className="dash-card" aria-labelledby="al-solved-title">
          <div className="card-head">
            <h3 id="al-solved-title"><CheckCircle2 size={16} aria-hidden="true" /> Solved alerts</h3>
            <button data-command="admin.alerts.export" type="button" className="dash-btn small ghost" disabled={!rows.length} onClick={exportCsv}><Download size={13} aria-hidden="true" /> Export CSV</button>
          </div>
          <div className="al-filters">
            <label className="al-search"><Search size={13} aria-hidden="true" /><input aria-label="Search solved alerts" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search alert, note or admin" /></label>
            <select aria-label="Level" value={level} onChange={(event) => setLevel(event.target.value as Level | "all")}>
              <option value="all">All levels</option><option value="critical">Critical</option><option value="important">Important</option><option value="info">Info</option>
            </select>
          </div>
          {notice ? <p className="pricing-notice" role="status">{notice}</p> : null}
          {shown.length === 0 ? <p className="dx-calm">{rows.length ? "Nothing matches." : "No alert solved yet. Solved alerts show here with who took them and who solved them."}</p> : (
            <ul className="al-done-list" aria-label="Solved alerts">
              {shown.slice(0, 60).map((row) => {
                const Icon = LEVEL_ICON[row.level];
                return (
                  <li key={`${row.id}-${row.doneAt}`} className={row.level}>
                    <span className="al-level" aria-hidden="true"><Icon size={14} /></span>
                    <span className="al-done-text">
                      <b>{row.title}</b>
                      <small>{row.takenBy === row.solvedBy ? `Taken and solved by ${agentName(row.solvedBy)}` : `Taken by ${agentName(row.takenBy)} · solved by ${agentName(row.solvedBy)}`} · {time(row.doneAt)} · {row.solveMin} min</small>
                      {row.note && row.note !== "Solved" ? <em>“{row.note}”</em> : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="al-side-cards">
          <section className="dash-card" aria-labelledby="al-week-title">
            <div className="card-head">
              <h3 id="al-week-title"><Mail size={16} aria-hidden="true" /> Weekly summary</h3>
              <button data-command="admin.alerts.export" type="button" className="dash-btn small ghost" onClick={() => { void navigator.clipboard?.writeText(summary.join("\n")).catch(() => undefined); setNotice("Weekly summary copied. Paste it in an email to managers."); }}><Copy size={13} aria-hidden="true" /> Copy</button>
            </div>
            <ul className="al-summary" aria-label="Weekly summary">{summary.map((line) => <li key={line}>{line}</li>)}</ul>
          </section>
          <section className="dash-card" aria-labelledby="al-kind-title">
            <div className="card-head"><h3 id="al-kind-title"><Timer size={16} aria-hidden="true" /> By kind</h3></div>
            {stats.byKind.length ? <ul className="al-bars">{stats.byKind.slice(0, 6).map((row) => <li key={row.kind}><span>{label(row.kind)}</span><b>{row.count}</b><small>{row.avgSolve} min</small><i style={{ width: `${(row.count / stats.byKind[0].count) * 100}%` }} /></li>)}</ul> : <p className="dx-calm">No numbers yet.</p>}
          </section>
          <section className="dash-card" aria-labelledby="al-admin-title">
            <div className="card-head"><h3 id="al-admin-title"><Trophy size={16} aria-hidden="true" /> By admin</h3></div>
            {stats.byAdmin.length ? <ul className="al-bars">{stats.byAdmin.slice(0, 6).map((row) => <li key={row.admin}><span>{agentName(row.admin)}</span><b>{row.count}</b><small>{row.avgSolve} min</small><i style={{ width: `${(row.count / stats.byAdmin[0].count) * 100}%` }} /></li>)}</ul> : <p className="dx-calm">No numbers yet.</p>}
          </section>
          {stats.repeats.length ? (
            <section className="dash-card" aria-labelledby="al-repeat-title">
              <div className="card-head"><h3 id="al-repeat-title"><Repeat size={16} aria-hidden="true" /> Keeps coming back</h3></div>
              <ul className="al-bars">{stats.repeats.slice(0, 5).map((row) => <li key={row.key}><span>{row.title}</span><b>{row.count}×</b></li>)}</ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
