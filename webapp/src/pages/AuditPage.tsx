import { formatOre } from "../domain/contract";
import { useApprovals, useAudit, useRevision } from "../api/hooks";
import { DataTable } from "../ui/DataTable";
import { CommandButton } from "../ui/CommandButton";

export function AuditPage() {
  const audit = useAudit();
  const approvals = useApprovals();
  const revision = useRevision();
  const rows = audit.data ?? [];
  const pending = (approvals.data ?? []).filter((item) => item.status === "pending");

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Audit and approvals</h2>
          <p>
            Generic command audit. Revision {revision.data ?? "…"}. Every business command records actor, action,
            target, scope, before, after, reason and result.
          </p>
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
            after="pending approval"
            amountOre={25_000}
          >
            Refund 250 kr
          </CommandButton>
        </div>
      </div>

      <article className="panel">
        <h3>Pending approvals</h3>
        {pending.length === 0 ? (
          <p className="state-line">No pending approvals.</p>
        ) : (
          <DataTable
            head={["Approval", "Action", "Target", "Requested by", "Amount", "Reason", "Status"]}
            rowIds={pending.map((item) => item.id)}
            rows={pending.map((item) => [
              item.id,
              item.action,
              item.targetId,
              item.requestedBy,
              formatOre(item.amountOre),
              item.reason,
              item.status,
            ])}
          />
        )}
      </article>

      <article className="panel">
        <h3>Command audit</h3>
        <DataTable
          head={["When", "Operation", "Agent", "Action", "Target", "Scope", "Before", "After", "Reason", "Result"]}
          rowIds={rows.map((entry) => entry.id)}
          rows={rows.map((entry) => [
            entry.at,
            entry.operationId,
            entry.actorId,
            entry.action,
            entry.targetId,
            entry.scope,
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
