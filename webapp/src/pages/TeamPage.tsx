import { useState } from "react";
import {
  ROLE_LABELS,
  changeAgentRole,
  deactivateAgent,
  inviteAgent,
  reactivateAgent,
  resetAgentCode,
  setAgentPresence,
  type Role,
} from "../auth/permissions";
import { useSession } from "../auth/SessionContext";
import { DataTable } from "../ui/DataTable";
import { CommandButton } from "../ui/CommandButton";

const ROLES = Object.keys(ROLE_LABELS) as Role[];

function scopeLabel(zones: "all" | string[]): string {
  return zones === "all" ? "All Stockholm" : zones.join(", ");
}

export function TeamPage() {
  const session = useSession();
  const actor = session.agent;
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("viewer");
  const [desiredRoles, setDesiredRoles] = useState<Record<string, Role>>({});
  const [notice, setNotice] = useState("Role and scope changes take effect from the stored demo team record.");

  if (!actor) return null;

  function apply(next: ReturnType<typeof deactivateAgent>, success: string) {
    if (!Array.isArray(next)) {
      setNotice(next.error);
      return;
    }
    session.setAgents(next);
    setNotice(success);
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Team and roles</h2>
          <p>Eleven planned admin roles are represented. Changes are permission-gated and stored in the demo session.</p>
        </div>
      </div>
      <p className="state-line">{notice}</p>

      <article className="panel">
        <h3>Invite agent</h3>
        <div className="field-grid">
          <label>
            Name
            <input value={inviteName} onChange={(event) => setInviteName(event.target.value)} />
          </label>
          <label>
            Email
            <input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} />
          </label>
          <label>
            Role
            <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as Role)}>
              {ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
            </select>
          </label>
        </div>
        <CommandButton
          command="admin.team.invite"
          className="primary-btn"
          type="button"
          onDone={() => {
            const next = inviteAgent(session.agents, { name: inviteName, email: inviteEmail, role: inviteRole }, actor);
            if (!Array.isArray(next)) {
              setNotice(next.error);
              return;
            }
            session.setAgents(next);
            setInviteName("");
            setInviteEmail("");
            setInviteRole("viewer");
            setNotice("Agent invited in the demo team.");
          }}
        >
          Invite agent
        </CommandButton>
      </article>

      <article className="panel">
        <DataTable
          head={["Name", "Email", "Role", "Presence", "Scope", "Status", "Actions"]}
          rowIds={session.agents.map((agent) => agent.id)}
          rows={session.agents.map((agent) => {
            const desired = desiredRoles[agent.id] ?? agent.role;
            return [
              agent.name,
              agent.email,
              <span key={`${agent.id}-role`}>
                <select
                  aria-label={`Role for ${agent.name}`}
                  value={desired}
                  disabled={actor.role !== "super" || actor.id === agent.id}
                  onChange={(event) => setDesiredRoles((current) => ({ ...current, [agent.id]: event.target.value as Role }))}
                >
                  {ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                </select>
                <CommandButton
                  command="admin.team.editRole"
                  className="link-action"
                  type="button"
                  disabled={desired === agent.role || actor.id === agent.id}
                  onDone={() => apply(changeAgentRole(session.agents, agent.id, desired, actor), `${agent.name} is now ${ROLE_LABELS[desired]}.`)}
                >
                  Apply
                </CommandButton>
              </span>,
              <span key={`${agent.id}-presence`}>
                {agent.presence}
                <CommandButton
                  command="admin.team.presence"
                  className="link-action"
                  type="button"
                  disabled={actor.role !== "super"}
                  onDone={() => apply(setAgentPresence(session.agents, agent.id, agent.presence === "online" ? "away" : "online", actor), `${agent.name} presence changed.`)}
                >
                  Toggle
                </CommandButton>
              </span>,
              scopeLabel(agent.scope.zones),
              agent.active ? "active" : "inactive",
              <span key={agent.id}>
                <CommandButton
                  command="admin.team.resetCode"
                  type="button"
                  className="link-action"
                  disabled={agent.id === actor.id}
                  targetId={agent.id}
                  onDone={() => apply(resetAgentCode(session.agents, agent.id, actor), `2-step code reset for ${agent.name}.`)}
                >
                  Reset 2-step
                </CommandButton>
                {agent.active ? (
                  <CommandButton
                    command="admin.team.deactivate"
                    type="button"
                    className="link-action danger-text"
                    disabled={agent.id === actor.id}
                    targetId={agent.id}
                    onDone={() => apply(deactivateAgent(session.agents, agent.id, actor), `${agent.name} deactivated.`)}
                  >
                    Deactivate
                  </CommandButton>
                ) : (
                  <CommandButton
                    command="admin.team.reactivate"
                    type="button"
                    className="link-action"
                    targetId={agent.id}
                    onDone={() => apply(reactivateAgent(session.agents, agent.id, actor), `${agent.name} reactivated.`)}
                  >
                    Reactivate
                  </CommandButton>
                )}
              </span>,
            ];
          })}
        />
      </article>
    </>
  );
}
