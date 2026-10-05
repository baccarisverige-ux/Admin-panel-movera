import { useState } from "react";
import { DEMO_PASSWORD } from "./domain";
import { useAdmin } from "./store";
import { Button, controlClass, Field } from "./ui";

export function LoginScreen() {
  const { db, login, completeLogin } = useAdmin();
  const [email, setEmail] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-4 py-10 text-ink">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-ink font-semibold text-paper">M</span>
          <div>
            <h1 className="text-xl font-semibold">Movera Admin</h1>
            <p className="text-sm text-muted">Stockholm operations · demo sign-in</p>
          </div>
        </div>
        <form
          className="rounded-2xl border border-line bg-paper p-5"
          onSubmit={(event) => {
            event.preventDefault();
            const problem = login(email, password);
            if (problem) {
              setError(problem);
              return;
            }
            setError("");
            completeLogin(email);
          }}
        >
          <Field label="Admin">
            <input className={controlClass} value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
          </Field>
          <div className="mt-3">
            <Field label="Password">
              <input className={controlClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
            </Field>
          </div>
          <p className="mt-2 text-xs text-muted">
            Full access: <span className="font-medium text-ink">admin</span> / <span className="font-medium text-ink">{DEMO_PASSWORD}</span>. Or skip the form.
          </p>
          {error ? <p className="mt-3 text-sm text-bad">{error}</p> : null}
          <Button className="mt-4 w-full" type="button" onClick={() => completeLogin("admin")}>Open everything</Button>
          <Button className="mt-2 w-full" variant="ghost" type="submit">Sign in with password</Button>
        </form>
        <div className="mt-4 rounded-2xl border border-line bg-paper p-4">
          <p className="text-xs font-medium text-muted">Other demo agents — same password, less access</p>
          <ul className="mt-2 space-y-1">
            {db?.agents.map((agent) => (
              <li key={agent.id}>
                <button className="h-10 text-left text-sm underline-offset-2 hover:underline" type="button" onClick={() => setEmail(agent.email)}>
                  {agent.name} · {agent.email}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}