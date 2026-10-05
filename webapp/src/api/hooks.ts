import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
export type { PaymentMethod } from "../payments/book.ts";
export { assignReservation, cancelReservation, needsDriverSoon } from "../reservations/book.ts";
export type { Reservation } from "../reservations/book.ts";
export { averageStars, BONUSES, hideReview } from "../growth/book.ts";
export type { Review } from "../growth/book.ts";
export { editContent, phonePreview, publishContent, rollbackContent } from "../content/book.ts";
export type { ContentBook } from "../content/book.ts";
export { emptyConfig, missingTranslations, publishConfig, rollbackConfig, setFeature } from "../config/book.ts";
export type { ConfigBook } from "../config/book.ts";

export function useRecords(name: string, scope: string | null) {
  const api = useAdminApi();
  return useQuery({ queryKey: ["records", name, scope ?? "all"], queryFn: () => api.list(name, scope) });
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

export function useCommand(action: string) {
  const api = useAdminApi();
  const client = useQueryClient();
  const [phase, setPhase] = useState<"idle" | "submitting" | "pending" | "committed" | "rejected">("idle");
  const [message, setMessage] = useState("");
  const mutation = useMutation({
    mutationFn: (input: Omit<CommandInput, "action">) => api.command({ ...input, action }),
    onSuccess: async (result) => {
      setPhase("committed");
      setMessage(result.message);
      await client.invalidateQueries();
    },
    onError: (error: Error) => {
      setPhase("rejected");
      setMessage(error.message);
    },
  });

  return {
    phase,
    message,
    run(input: Omit<CommandInput, "action">) {
      if (phase === "submitting" || mutation.isPending) return Promise.resolve(undefined);
      setPhase("submitting");
      return mutation.mutateAsync(input).catch((error: Error) => {
        setPhase("rejected");
        setMessage(error.message);
        return undefined;
      });
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
