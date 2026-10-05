import { useState } from "react";
import { useSession } from "../auth/SessionContext";
import { emptyDb, runCommand, type CommandDb } from "../commands/run";
import { DataTable } from "../ui/DataTable";

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
        <DataTable
          head={["When", "Agent", "Action", "Target", "Before", "After", "Reason", "Result"]}
          rows={db.audits.map((entry) => [entry.at, entry.actorId, entry.action, entry.targetId, entry.before, entry.after, entry.reason, entry.result])}
        />
      </article>
    </>
  );
}
