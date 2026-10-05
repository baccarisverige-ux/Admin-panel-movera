import { deactivateAgent } from "../auth/permissions";
import { useSession } from "../auth/SessionContext";
import { DataTable } from "../ui/DataTable";
import { CommandButton } from "../ui/CommandButton";

export function TeamPage() {
  const session = useSession();
  const actor = session.agent;
  if (!actor) return null;

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Team and roles</h2>
          <p>Demo agents. Deactivate takes effect on the next sign-in.</p>
        </div>
      </div>
      <article className="panel">
        <DataTable
          head={["Name", "Email", "Role", "Status", "Actions"]}
          rows={session.agents.map((agent) => [
            agent.name,
            agent.email,
            agent.role,
            agent.active ? "Active" : "Deactivated",
            <CommandButton command="admin.team.deactivate" key={agent.id}
              type="button"
              className="link-action danger-text"
              disabled={!agent.active || agent.id === actor.id || actor.role !== "super"} onDone={() => {
                const next = deactivateAgent(session.agents, agent.id, actor);
                if (!Array.isArray(next)) return;
                session.setAgents(next);
              }}>
              Deactivate
            </CommandButton>,
          ])}
        />
      </article>
    </>
  );
}
