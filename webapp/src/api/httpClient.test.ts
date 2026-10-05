import { ApiError, apiRequest, classifyStatus } from "./httpClient.ts";

const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message);
};

assert(classifyStatus(409) === "Someone else changed this. Reload.", "409 is a conflict, not success");
assert(classifyStatus(0).includes("Offline"), "offline");

await apiRequest("", "/ready").then(
  () => {
    throw new Error("empty base should reject");
  },
  (error: unknown) => assert(error instanceof ApiError && /not connected/.test(error.message), "not connected"),
);

const conflict = await apiRequest("https://staging.example", "/ready", {}, async () => ({ ok: false, status: 409, json: async () => ({}) })).then(
  () => "ok",
  (error: unknown) => error,
);
assert(conflict instanceof ApiError && conflict.status === 409, "409 is not treated as success");

const ready = await apiRequest("https://staging.example", "/ready", {}, async () => ({
  ok: true,
  status: 200,
  json: async () => ({ currency: "SEK", timeZone: "Europe/Stockholm" }),
}));
assert((ready as { currency: string }).currency === "SEK", "ready body");

console.log("http client ok");
