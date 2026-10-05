export type Incident = {
  id: string;
  state: "queued" | "taken" | "resolved";
  locationAt: string;
  accuracyM: number;
  ownerId: string | null;
};

export const IMPOSSIBLE_TRAVEL_MPS = 55;

export function takeIncident(incident: Incident, agentId: string): Incident {
  return { ...incident, state: "taken", ownerId: agentId };
}

export function resolveIncident(incident: Incident): { incident: Incident; error?: string } {
  if (incident.state !== "taken") return { incident, error: "Take the incident before resolving it." };
  return { incident: { ...incident, state: "resolved" } };
}

export function publicIncident(incident: Incident): { id: string; state: string; locationAt: string; accuracyM: number } {
  return { id: incident.id, state: incident.state, locationAt: incident.locationAt, accuracyM: incident.accuracyM };
}

export function impossibleTravel(distanceM: number, seconds: number): boolean {
  if (seconds <= 0) return false;
  return distanceM / seconds > IMPOSSIBLE_TRAVEL_MPS;
}
