import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AGENTS, IDLE_MS, isIdle, signIn, type Agent } from "./permissions";

type SessionValue = {
  agent: Agent | null;
  agents: Agent[];
  error: string | null;
  signInWith: (email: string, password: string, code: string) => Agent | null;
  signOut: () => void;
  setAgents: (next: Agent[]) => void;
};

const SessionContext = createContext<SessionValue | null>(null);
const SESSION_KEY = "movera-admin-session";
const AGENTS_KEY = "movera-admin-agents";
const ACTIVITY_KEY = "movera-admin-activity";

function readAgents(): Agent[] {
  const raw = localStorage.getItem(AGENTS_KEY);
  if (!raw) return AGENTS;
  try {
    const parsed = JSON.parse(raw) as Partial<Agent>[];
    if (!Array.isArray(parsed) || parsed.length === 0) return AGENTS;
    return parsed
      .filter((item): item is Partial<Agent> & Pick<Agent, "id" | "email" | "name" | "role"> =>
        typeof item.id === "string" && typeof item.email === "string" && typeof item.name === "string" && typeof item.role === "string",
      )
      .map((item) => {
        const fallback = AGENTS.find((agent) => agent.id === item.id || agent.email === item.email);
        return {
          ...(fallback ?? AGENTS[0]!),
          ...item,
          password: item.password ?? fallback?.password ?? "movera",
          code: item.code ?? fallback?.code ?? "123456",
          active: item.active ?? true,
          presence: item.presence ?? "away",
          scope: item.scope ?? fallback?.scope ?? { zones: "all", market: "SE-STO" as const },
        } as Agent;
      });
  } catch {
    return AGENTS;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [agents, setAgentsState] = useState<Agent[]>(() => readAgents());
  const [agent, setAgent] = useState<Agent | null>(() => {
    const id = localStorage.getItem(SESSION_KEY);
    const last = Number(localStorage.getItem(ACTIVITY_KEY) || "0");
    if (!id || isIdle(last, Date.now())) return null;
    return readAgents().find((item) => item.id === id && item.active) ?? null;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agent) return;
    const mark = () => localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    mark();
    const events = ["pointerdown", "keydown"] as const;
    events.forEach((name) => window.addEventListener(name, mark));
    const timer = window.setInterval(() => {
      const last = Number(localStorage.getItem(ACTIVITY_KEY) || "0");
      if (isIdle(last, Date.now(), IDLE_MS)) {
        localStorage.removeItem(SESSION_KEY);
        queryClient.clear();
        setAgent(null);
      }
    }, 30_000);
    return () => {
      events.forEach((name) => window.removeEventListener(name, mark));
      window.clearInterval(timer);
    };
  }, [agent]);

  const value = useMemo<SessionValue>(
    () => ({
      agent,
      agents,
      error,
      signInWith(email, password, code) {
        const result = signIn(agents, { email, password, code });
        if (!result.ok) {
          setError(result.error);
          return null;
        }
        localStorage.setItem(SESSION_KEY, result.agent.id);
        localStorage.setItem(ACTIVITY_KEY, String(Date.now()));
        setError(null);
        setAgent(result.agent);
        return result.agent;
      },
      signOut() {
        localStorage.removeItem(SESSION_KEY);
        queryClient.clear();
        setAgent(null);
      },
      setAgents(next) {
        localStorage.setItem(AGENTS_KEY, JSON.stringify(next));
        setAgentsState(next);
      },
    }),
    [agent, agents, error, queryClient],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("Session is missing.");
  return value;
}
