import { useMemo, useState } from "react";
import { useApprovals, useAudit } from "../api/hooks";
import { DataTable } from "../ui/DataTable";
import { CommandButton } from "../ui/CommandButton";

export function AuditPage() {
  const audit = useAudit();
  const approvals = useApprovals();
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [target, setTarget] = useState("");

  const rows = useMemo(() => {
    const actorNeedle = actor.trim().toLowerCase();
    const actionNeedle = action.trim().toLowerCase();
    const targetNeedle = target.trim().toLowerCase();
    return (audit.data ?? []).filter((entry) => {
      if (actorNeedle && !entry.actorId.toLowerCase().includes(actorNeedle)) return false;
      if (actionNeedle && !entry.action.toLowerCase().includes(actionNeedle)) return false;
      if (targetNeedle && !entry.targetId.toLowerCase().includes(targetNeedle)) return false;
      return true;
    });
  }, [action, actor, audit.data, target]);

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Audit and approvals</h2>
          <p>Every simulated mutation records operation, actor, scope, target, before, after, reason and result.</p>
        </div>
        <div className="actions">
          <CommandButton
            command="admin.audit.refund50"
            className="secondary-btn"
            type="button"
            targetId="RF-SMALL"
            before="open"
            after="refunded"
            amountOre={5_000}
          >
            Refund 50 kr
          </CommandButton>
          <CommandButton
            command="admin.audit.refund250"
            className="primary-btn"
            type="button"
            targetId="RF-LARGE"
            before="open"
            after="refunded"
            amountOre={25_000}
          >
            Refund 250 kr
          </CommandButton>
        </div>
      </div>

      <article className="panel">
        <h3>Approval queue</h3>
        <p className="state-line">Actions at or above their ActionSpec threshold stop before the mutation and enter this queue.</p>
        <DataTable
          head={["Approval", "Action", "Target", "Requested by", "Amount", "Reason", "Status"]}
          rowIds={(approvals.data ?? []).map((item) => item.id)}
          rows={(approvals.data ?? []).map((item) => [
            item.id,
            item.action,
            item.targetId,
            item.requestedBy,
            `${(item.amountOre / 100).toFixed(2)} kr`,
            item.reason,
            item.status,
          ])}
          state={approvals.isLoading ? "loading" : approvals.isError ? "error" : "ready"}
          onRetry={() => void approvals.refetch()}
        />
      </article>

      <article className="panel">
        <h3>Immutable activity</h3>
        <div className="field-grid">
          <label>
            Agent
            <input value={actor} onChange={(event) => setActor(event.target.value)} />
          </label>
          <label>
            Action
            <input value={action} onChange={(event) => setAction(event.target.value)} />
          </label>
          <label>
            Target
            <input value={target} onChange={(event) => setTarget(event.target.value)} />
          </label>
        </div>
        <DataTable
          head={["Operation", "When", "Agent", "Scope", "Action", "Target", "Before", "After", "Reason", "Result"]}
          rowIds={rows.map((entry) => entry.id)}
          rows={rows.map((entry) => [
            entry.operationId,
            entry.at,
            entry.actorId,
            entry.scope,
            entry.action,
            entry.targetId,
            entry.before,
            entry.after,
            entry.reason,
            entry.result,
          ])}
          state={audit.isLoading ? "loading" : audit.isError ? "error" : "ready"}
          onRetry={() => void audit.refetch()}
        />
      </article>
    </>
  );
}
