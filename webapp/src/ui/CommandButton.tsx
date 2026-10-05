import { useState, type ReactNode } from "react";
import { useCommands } from "../api/hooks";
import { can } from "../auth/permissions";
import { useSession } from "../auth/SessionContext";
import { ACTION_REASONS } from "../domain/labels";
import { commandById } from "../commands/registry";

type CommandButtonProps = {
  command: string;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  title?: string;
  targetId?: string;
  before?: string;
  after?: string;
  entityState?: string;
  amountOre?: number;
  collection?: string;
  patch?: Record<string, string | number | boolean | null>;
  scope?: string;
  storeReason?: boolean;
  onDone?: () => void;
  children: ReactNode;
  "aria-label"?: string;
};

export function CommandButton({
  command,
  className,
  type = "button",
  disabled,
  title,
  targetId,
  before,
  after,
  entityState,
  amountOre,
  collection,
  patch,
  scope,
  storeReason,
  onDone,
  children,
  "aria-label": ariaLabel,
}: CommandButtonProps) {
  const commands = useCommands();
  const session = useSession();
  const spec = commandById(command);
  const denied = Boolean(spec && session.agent && !can(session.agent.role, spec.permission));
  const disabledReason = !spec ? "Action is not registered." : denied ? "Your role cannot perform this action." : undefined;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(ACTION_REASONS[0]);
  const [typed, setTyped] = useState("");
  const mustType = targetId ?? "";
  const confirmed = mustType.length === 0 || typed === mustType;

  function fire(chosen: string) {
    void commands.run(command, {
      reason: chosen,
      targetId,
      before,
      after,
      entityState,
      amountOre,
      collection,
      patch: patch ? { ...patch, ...(storeReason ? { notes: chosen } : {}) } : undefined,
      scope,
    }).then((result) => {
      if (result) onDone?.();
    });
  }

  return (
    <>
      <button
        data-command={command}
        className={className}
        type={type}
        aria-label={ariaLabel}
        disabled={disabled || commands.phase === "submitting" || !spec || denied}
        title={title ?? disabledReason}
        onClick={() => {
          if (!spec) return;
          if (spec.reason) setOpen(true);
          else fire("No person affected");
        }}
      >
        {children}
      </button>
      {commands.message ? <p className="state-line">{commands.message}</p> : null}
      {open ? (
        <div className="modal open" role="presentation">
          <form
            className="modal-card"
            onSubmit={(event) => {
              event.preventDefault();
              if (!confirmed) return;
              setOpen(false);
              fire(reason);
            }}
          >
            <h3>{spec?.label}</h3>
            <p>This acts on {targetId ?? spec?.label}.</p>
            <label>
              Reason
              <select value={reason} onChange={(event) => setReason(event.target.value as typeof reason)}>
                {ACTION_REASONS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            {mustType ? (
              <label>
                Type {mustType} to confirm
                <input value={typed} onChange={(event) => setTyped(event.target.value)} />
              </label>
            ) : null}
            <button data-command="admin.confirm.submit" className="primary-btn" type="submit" disabled={!confirmed}>Confirm</button>
            <button data-command="admin.confirm.cancel" className="secondary-btn" type="button" onClick={() => setOpen(false)}>Cancel</button>
          </form>
        </div>
      ) : null}
    </>
  );
}
