import { deactivateAgent } from "../auth/permissions";
import { useSession } from "../auth/SessionContext";

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
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {session.agents.map((agent) => (
              <tr key={agent.id}>
                <td>{agent.name}</td>
                <td>{agent.email}</td>
                <td>{agent.role}</td>
                <td>{agent.active ? "Active" : "Deactivated"}</td>
                <td>
                  <button
                    type="button"
                    className="link-action danger-text"
                    disabled={!agent.active || agent.id === actor.id || actor.role !== "super"}
                    onClick={() => {
                      const next = deactivateAgent(session.agents, agent.id, actor);
                      if (!Array.isArray(next)) return;
                      session.setAgents(next);
                    }}
                  >
                    Deactivate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </>
  );
}
