import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { canUseZone } from "../auth/permissions.ts";
import { useSession } from "../auth/SessionContext.tsx";
import { commandById } from "../commands/registry.ts";
import { useAdminApi } from "./AdminApiContext.tsx";
import type { CommandInput } from "./create.ts";

export { advancePrivacy, blockRider, creditWallet, findRiders, RIDERS, signOutRider } from "../riders/book.ts";
export type { Rider } from "../riders/book.ts";
export { advance, testSend } from "../messages/book.ts";
export type { Delivery, Outbound } from "../messages/book.ts";
export { addNote, claim, deliveredToRider, reply } from "../support/book.ts";
export type { Ticket } from "../support/book.ts";
export { publicIncident, resolveIncident, takeIncident } from "../safety/book.ts";
export type { Incident } from "../safety/book.ts";
export { markPaid, PAYMENT_METHODS, setMethod } from "../payments/book.ts";
export type { BankAccount, PaymentMethod, Payout } from "../payments/book.ts";
export { assignReservation, cancelReservation, needsDriverSoon } from "../reservations/book.ts";
export type { Reservation } from "../reservations/book.ts";
export { averageStars, BONUSES, hideReview } from "../growth/book.ts";
export type { Review } from "../growth/book.ts";
export { editContent, phonePreview, publishContent, rollbackContent } from "../content/book.ts";
export type { ContentBook } from "../content/book.ts";
export { approveConfig, configDiff, effectiveValue, emptyConfig, missingTranslations, normalizeConfig, publishConfig, rollbackConfig, REASON_GROUPS, setAppUpdate, setAppVersion, setEnvironment, setFeature, setMaxStops, setReason, setSchedule, setSwitch, setZoneOverride, submitConfigApproval } from "../config/book.ts";
export type { ConfigBook } from "../config/book.ts";

export function useRecords(name: string, scope?: string | null) {
  const api = useAdminApi();
  const session = useSession();
  const [params] = useSearchParams();
  const requested = scope ?? params.get("scope");
  const scopeDenied = Boolean(requested && session.agent && !canUseZone(session.agent, requested));
  const effectiveScope = scopeDenied ? "__scope-denied__" : requested;
  const query = useQuery({
    queryKey: ["records", name, effectiveScope ?? "all", session.agent?.id ?? "signed-out"],
    queryFn: () => api.list(name, effectiveScope),
  });
  return { ...query, scopeDenied, effectiveScope };
}

export function useDrivers(scope: string | null) {
  return useRecords("drivers", scope);
}

export function useDriver(id: string, scope: string | null) {
  const query = useDrivers(scope);
  return { ...query, driver: query.data?.find((row) => row.id === id) };
}

export function useRiders(scope: string | null) {
  return useRecords("riders", scope);
}

export function useTrips(scope: string | null) {
  return useRecords("trips", scope);
}

export function useSearch(query: string) {
  const api = useAdminApi();
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => api.search(query),
    enabled: query.trim().length > 1,
  });
}

export function useInbox() {
  const api = useAdminApi();
  return useQuery({ queryKey: ["inbox"], queryFn: () => api.inbox() });
}

export function useFreshness() {
  const api = useAdminApi();
  return useQuery({ queryKey: ["freshness"], queryFn: () => api.freshness() });
}

let commandLock = false;

export function useCommands() {
  const api = useAdminApi();
  const client = useQueryClient();
  const session = useSession();
  const [phase, setPhase] = useState<"idle" | "submitting" | "unknown" | "committed" | "rejected">("idle");
  const [message, setMessage] = useState("");

  async function run(id: string, extra: Partial<CommandInput> = {}) {
    const spec = commandById(id);
    if (!spec) throw new Error(`Unknown command ${id}`);
    if (commandLock) return undefined;
    if (spec.reason && !extra.reason) {
      setPhase("rejected");
      setMessage("A reason is required.");
      return undefined;
    }
    commandLock = true;
    setPhase("submitting");
    setMessage("");
    let unknown = false;
    const timer = setTimeout(() => {
      unknown = true;
      setPhase("unknown");
      setMessage("Unknown. Check the audit before trying again.");
    }, 900);
    try {
      const result = await api.command({
        action: id,
        targetId: extra.targetId ?? id,
        reason: extra.reason ?? "No person affected",
        actorId: extra.actorId ?? session.agent?.id ?? "signed-out",
        before: extra.before ?? "",
        after: extra.after ?? spec.label,
        sliceKey: extra.sliceKey,
        value: extra.value,
        collection: extra.collection,
        patch: extra.patch,
      });
      clearTimeout(timer);
      if (!unknown) {
        setPhase("committed");
        setMessage(result.message);
      }
      await client.invalidateQueries();
      return result;
    } catch (error) {
      clearTimeout(timer);
      if (!unknown) {
        setPhase("rejected");
        setMessage(error instanceof Error ? error.message : "Rejected");
      }
      return undefined;
    } finally {
      commandLock = false;
    }
  }

  return { run, phase, message };
}

export function useCommand(action: string) {
  const commands = useCommands();
  return {
    phase: commands.phase,
    message: commands.message,
    run(input: Omit<CommandInput, "action">) {
      return commands.run(action, input);
    },
  };
}

export function useSlice<T>(key: string, fallback: T) {
  const api = useAdminApi();
  const query = useQuery({ queryKey: ["slice", key], queryFn: () => api.readSlice(key, fallback) });
  const command = useCommand(`admin.${key}.save`);
  return {
    value: query.data ?? fallback,
    loading: query.isLoading,
    message: command.message,
    async save(value: T, meta: { targetId: string; reason: string; actorId: string; before: string; after: string }) {
      await command.run({ ...meta, sliceKey: key, value });
    },
  };
}
