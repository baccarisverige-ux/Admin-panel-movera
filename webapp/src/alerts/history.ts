import type { SafetyBook } from "../safety/ops.ts";
import { historyRows, type AlertBook, type HistoryRow } from "./engine.ts";

/** Every solved alert with who took it and who solved it. SOS come from Incidents, with the same names. */
export function solvedHistory(book: AlertBook, safety: SafetyBook, zoneOf: (incidentId: string) => string | null): HistoryRow[] {
  const sos: HistoryRow[] = Object.entries(safety.incidents).flatMap(([id, item]) => {
    const take = item.events.find((event) => event.kind === "take");
    const done = [...item.events].reverse().find((event) => event.kind === "resolve");
    if (!done) return [];
    const since = take ? Date.parse(take.at) - 2 * 60_000 : Date.parse(done.at);
    return [{
      id: `sos:${id}`, kind: "sos", level: "critical", title: `SOS ${id}`, zoneId: zoneOf(id), since: new Date(since).toISOString(), status: "done", owner: done.actor, events: [],
      takenBy: take?.actor ?? done.actor, solvedBy: done.actor, takeMin: take ? Math.round((Date.parse(take.at) - since) / 60_000) : 0, solveMin: Math.round((Date.parse(done.at) - since) / 60_000), note: done.text, doneAt: done.at,
    }];
  });
  return [...historyRows(book), ...sos].sort((a, b) => b.doneAt.localeCompare(a.doneAt));
}
