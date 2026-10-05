import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Result } from "./actions";
import { canDo, DEMO_PASSWORD, inZoneScope, type Agent, type DemoDb, type Permission, type ZoneId } from "./domain";
import { createSeed } from "./seed";

const DB_KEY = "movera-admin-db-v1";
const SESSION_KEY = "movera-admin-session";

function findAgent(db: DemoDb | null, email: string) {
  if (!db) return undefined;
  const key = email.trim().toLowerCase();
  if (key === "admin" || key === "administrator" || key === "admin@movera.se") {
    return db.agents.find((item) => item.role === "super");
  }
  return db.agents.find((item) => item.email.toLowerCase() === key);
}

type Toast = { id: number; text: string; tone: "ok" | "err" };

type AdminContext = {
  ready: boolean;
  db: DemoDb | null;
  agent: Agent | null;
  busy: boolean;
  toasts: Toast[];
  revealed: string[];
  can: (permission: Permission) => boolean;
  login: (email: string, password: string) => string | null;
  completeLogin: (email: string) => void;
  logout: () => void;
  switchAgent: (id: string) => void;
  run: (fn: (db: DemoDb, agent: Agent) => Result) => Promise<boolean>;
  reset: () => void;
  reveal: (target: string) => Promise<void>;
  scopeZone: ZoneId | "all";
  setScopeZone: (zone: ZoneId | "all") => void;
};

const Ctx = createContext<AdminContext | null>(null);

let activeScope: ZoneId | "all" = "all";

function superAgentId(data: DemoDb | null) {
  return data?.agents.find((item) => item.role === "super")?.id ?? data?.agents[0]?.id ?? null;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(true);
  const [db, setDb] = useState<DemoDb | null>(() => createSeed());
  const [agentId, setAgentId] = useState<string | null>(() => superAgentId(createSeed()));
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [scopeZone, setScopeZone] = useState<ZoneId | "all">("all");
  const dbRef = useRef<DemoDb | null>(null);
  const busyRef = useRef(false);
  const toastId = useRef(1);
  dbRef.current = db;

  useEffect(() => {
    let next = createSeed();
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DemoDb;
        const usable = parsed?.schema === 1 && Array.isArray(parsed.drivers) && Array.isArray(parsed.agents) && parsed.agents.some((item) => item.role === "super");
        if (usable) {
          const fresh = createSeed();
          const saved = parsed.settings ?? fresh.settings;
          parsed.settings = {
            ...fresh.settings,
            ...saved,
            dispatch: { ...fresh.settings.dispatch, ...saved.dispatch },
            driving: { ...fresh.settings.driving, ...saved.driving },
            reservations: { ...fresh.settings.reservations, ...saved.reservations, policy: saved.reservations?.policy?.length ? saved.reservations.policy : fresh.settings.reservations.policy },
            safety: { ...fresh.settings.safety, ...saved.safety },
          };
          if (!Array.isArray(parsed.releases)) parsed.releases = [];
          if (parsed.roleGrants?.ops && !parsed.roleGrants.ops.includes("settings.edit")) {
            parsed.roleGrants.ops = [...parsed.roleGrants.ops, "settings.edit"];
          }
          next = parsed;
        }
      }
    } catch {
      next = createSeed();
    }
    const id = superAgentId(next);
    if (id) localStorage.setItem(SESSION_KEY, id);
    setDb(next);
    setAgentId(id);
    setReady(true);
  }, []);

  function push(text: string, tone: Toast["tone"]) {
    const id = toastId.current++;
    setToasts((list) => [...list, { id, text, tone }]);
    window.setTimeout(() => setToasts((list) => list.filter((item) => item.id !== id)), 3400);
  }

  function persist(next: DemoDb) {
    localStorage.setItem(DB_KEY, JSON.stringify(next));
    setDb(next);
  }

  const agent = db?.agents.find((item) => item.id === agentId) ?? null;

  const api = useMemo<AdminContext>(() => {
    return {
      ready,
      db,
      agent,
      busy,
      toasts,
      revealed,
      scopeZone,
      setScopeZone,
      can: (permission) => canDo(agent, db?.roleGrants ?? createSeed().roleGrants, permission),
      login: (email, password) => {
        const found = findAgent(db, email);
        if (!found || password.trim().toLowerCase() !== DEMO_PASSWORD) {
          return "That sign-in did not open the panel. Use admin and password demo.";
        }
        return null;
      },
      completeLogin: (email: string) => {
        const found = findAgent(db, email);
        if (!found) return;
        localStorage.setItem(SESSION_KEY, found.id);
        setAgentId(found.id);
      },
      logout: () => {
        localStorage.removeItem(SESSION_KEY);
        setAgentId(null);
        setRevealed([]);
      },
      switchAgent: (id) => {
        localStorage.setItem(SESSION_KEY, id);
        setAgentId(id);
        setRevealed([]);
        const name = db?.agents.find((item) => item.id === id)?.name ?? "agent";
        push(`Now viewing as ${name} (demo)`, "ok");
      },
      run: async (fn) => {
        const current = dbRef.current;
        const who = current?.agents.find((item) => item.id === agentId);
        if (!current || !who) return false;
        if (busyRef.current) {
          push("Still saving. Wait for this one to finish.", "err");
          return false;
        }
        const rev = current.rev;
        busyRef.current = true;
        setBusy(true);
        await new Promise((resolve) => window.setTimeout(resolve, 140));
        if (dbRef.current && dbRef.current.rev !== rev) {
          push("Someone else saved first. Refresh the value and try again.", "err");
          busyRef.current = false;
          setBusy(false);
          return false;
        }
        if (current.settings.simulateErrors && Math.random() < 1 / 30) {
          push("Could not save (demo). Try again.", "err");
          busyRef.current = false;
          setBusy(false);
          return false;
        }
        const result = fn(current, who);
        if (!result.ok) {
          push(result.error, "err");
          busyRef.current = false;
          setBusy(false);
          return false;
        }
        persist(result.db);
        push(result.toast, "ok");
        busyRef.current = false;
        setBusy(false);
        return true;
      },
      reset: () => {
        const fresh = createSeed();
        persist(fresh);
        setRevealed([]);
        push("Demo data reset", "ok");
      },
      reveal: async (target) => {
        const current = dbRef.current;
        const who = current?.agents.find((item) => item.id === agentId);
        if (!current || !who) return;
        const { revealSensitive } = await import("./actions");
        const result = revealSensitive(current, who, target);
        if (!result.ok) {
          push(result.error, "err");
          return;
        }
        persist(result.db);
        setRevealed((list) => (list.includes(target) ? list : [...list, target]));
      },
    };
  }, [ready, db, agent, agentId, busy, toasts, revealed, scopeZone]);

  activeScope = scopeZone;
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useAdmin(): AdminContext {
  const value = useContext(Ctx);
  if (!value) throw new Error("useAdmin outside provider");
  return value;
}

export function scopedDrivers(db: DemoDb, agent: Agent) {
  return db.drivers.filter((driver) => {
    if (agent.fleetPartnerId && driver.fleetPartnerId !== agent.fleetPartnerId) return false;
    return inZoneScope(agent, driver.zoneId) && (activeScope === "all" || driver.zoneId === activeScope);
  });
}

export function scopedRiders(db: DemoDb, agent: Agent) {
  const drivers = new Set(scopedDrivers(db, agent).map((driver) => driver.id));
  return db.riders.filter((rider) => {
    if (agent.fleetPartnerId) {
      return db.trips.some((trip) => trip.riderId === rider.id && trip.driverId && drivers.has(trip.driverId));
    }
    return inZoneScope(agent, rider.zoneId) && (activeScope === "all" || rider.zoneId === activeScope);
  });
}

export function scopedTrips(db: DemoDb, agent: Agent) {
  const drivers = new Set(scopedDrivers(db, agent).map((driver) => driver.id));
  return db.trips.filter((trip) => {
    if (activeScope !== "all" && trip.zoneId !== activeScope) return false;
    if (agent.fleetPartnerId) return !!trip.driverId && drivers.has(trip.driverId);
    if (trip.driverId) return drivers.has(trip.driverId) || inZoneScope(agent, trip.zoneId);
    return inZoneScope(agent, trip.zoneId);
  });
}
