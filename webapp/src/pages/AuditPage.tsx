import { useState } from "react";
import { useSession } from "../auth/SessionContext";
import { emptyDb, runCommand, type CommandDb } from "../commands/run";

const STORE_KEY = "movera-admin-commands";

function loadDb(): CommandDb {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return emptyDb();
  try {
    const parsed = JSON.parse(raw) as CommandDb;
    if (!parsed || !Array.isArray(parsed.audits)) return emptyDb();
    return parsed;
  } catch {
    return emptyDb();
  }
}

export function AuditPage() {
  const { agent } = useSession();
  const [db, setDb] = useState<CommandDb>(() => loadDb());
  const [message, setMessage] = useState("No command yet.");

  function commit(next: CommandDb, text: string) {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
    setDb(next);
    setMessage(text);
  }

  function request(amountOre: number) {
    if (!agent) return;
    const ran = runCommand(
      db,
      {
        action: "admin.refund.decide",
        idempotencyKey: `ui-${db.audits.length}-${amountOre}-${agent.id}`,
        expectedRev: db.rev,
        actorId: agent.id,
        targetId: amountOre >= 20_000 ? "RF-LARGE" : "RF-SMALL",
        reason: "Demo refund from the audit screen",
        amountOre,
      },
      new Date().toISOString(),
    );
    commit(ran.db, `${ran.outcome.status} · ${ran.outcome.message}`);
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Audit and approvals</h2>
          <p>Commands record who, what, when, before, after and the reason. Version {db.rev}.</p>
        </div>
        <div className="actions">
          <button className="secondary-btn" type="button" onClick={() => request(5_000)}>
            Refund 50 kr
          </button>
          <button className="primary-btn" type="button" onClick={() => request(25_000)}>
            Refund 250 kr
          </button>
        </div>
      </div>
      <p className="state-line">{message}</p>
      <article className="panel">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Agent</th>
              <th>Action</th>
              <th>Target</th>
              <th>Before</th>
              <th>After</th>
              <th>Reason</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {db.audits.length === 0 ? (
              <tr>
                <td colSpan={8}>No audit rows yet.</td>
              </tr>
            ) : (
              db.audits.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.at}</td>
                  <td>{entry.actorId}</td>
                  <td>{entry.action}</td>
                  <td>{entry.targetId}</td>
                  <td>{entry.before}</td>
                  <td>{entry.after}</td>
                  <td>{entry.reason}</td>
                  <td>{entry.result}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </article>
    </>
  );
}
