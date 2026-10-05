import { catalogFor, type CatalogEntry } from "../data/catalog.ts";
import { CURRENCY, TIME_ZONE } from "../domain/contract.ts";
import { apiRequest } from "./httpClient.ts";

export type ApiEnv = {
  PROD: boolean;
  VITE_DATA?: string;
  VITE_ADMIN_API?: string;
};

export type PageResult = CatalogEntry;

export type AdminApi = {
  kind: "fixture" | "http";
  demo: boolean;
  ready: () => Promise<{ currency: typeof CURRENCY; timeZone: typeof TIME_ZONE; demo: boolean }>;
  page: (pageId: string) => Promise<PageResult>;
};

const DEMO_DELAY_MS = 200;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function createFixtureAdminApi(delayMs = DEMO_DELAY_MS): AdminApi {
  return {
    kind: "fixture",
    demo: true,
    async ready() {
      await wait(delayMs);
      return { currency: CURRENCY, timeZone: TIME_ZONE, demo: true };
    },
    async page(pageId) {
      await wait(delayMs);
      return catalogFor(pageId);
    },
  };
}

export function createHttpAdminApi(baseUrl = ""): AdminApi {
  return {
    kind: "http",
    demo: false,
    async ready() {
      const body = (await apiRequest(baseUrl, "/ready")) as { currency?: string; timeZone?: string };
      if (body.currency !== CURRENCY || body.timeZone !== TIME_ZONE) {
        throw new Error("The ready payload is not Stockholm SEK.");
      }
      return { currency: CURRENCY, timeZone: TIME_ZONE, demo: false };
    },
    async page(pageId) {
      return (await apiRequest(baseUrl, `/pages/${encodeURIComponent(pageId)}`)) as PageResult;
    },
  };
}

/**
 * A production build refuses the simulation unless this deploy is explicitly
 * the demo environment (VITE_DATA=demo). Real production must set
 * VITE_ADMIN_API=http.
 */
export function createAdminApi(env: ApiEnv, delayMs = DEMO_DELAY_MS): AdminApi {
  const api = env.VITE_ADMIN_API ?? "";
  if (api === "http" || api.startsWith("http://") || api.startsWith("https://")) {
    return createHttpAdminApi(api === "http" ? "" : api);
  }
  if (env.PROD && env.VITE_DATA !== "demo") {
    throw new Error("Production refuses the simulation adapter.");
  }
  return createFixtureAdminApi(delayMs);
}
