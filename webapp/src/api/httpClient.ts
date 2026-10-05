export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const STATUS_TEXT: Record<number, string> = {
  401: "Sign in again.",
  403: "Your role cannot do that.",
  409: "Someone else changed this. Reload.",
  422: "That value was refused.",
  429: "Too many attempts. Wait.",
  503: "The service is unavailable.",
};

export function classifyStatus(status: number): string {
  if (status === 0) return "Offline. Nothing was saved.";
  return STATUS_TEXT[status] ?? `Request failed (${status}).`;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export async function apiRequest(base: string, path: string, init: RequestInit & { idempotencyKey?: string } = {}, fetchImpl: FetchLike = fetch): Promise<unknown> {
  if (!base.trim()) throw new ApiError(0, "Admin API is not connected.");
  const headers = new Headers(init.headers);
  if (init.idempotencyKey) headers.set("Idempotency-Key", init.idempotencyKey);
  let response: { ok: boolean; status: number; json: () => Promise<unknown> };
  try {
    response = await fetchImpl(`${base.replace(/\/$/, "")}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, classifyStatus(0));
  }
  if (!response.ok) throw new ApiError(response.status, classifyStatus(response.status));
  return response.json();
}
