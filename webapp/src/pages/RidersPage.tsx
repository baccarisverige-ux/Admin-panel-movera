import { useState } from "react";
import { useSession } from "../auth/SessionContext";
import { ACTION_REASONS } from "../domain/labels";
import { RIDERS, blockRider, creditWallet, findRiders, signOutRider, advancePrivacy, useCommand, useRiders, useSlice, type Rider } from "../api/hooks";
import { ConfirmDialog } from "../ui/kit";

export function RidersPage() {
  const session = useSession();
  const seeded = useRiders(null);
  const stored = useSlice("rider-cards", RIDERS);
  const command = useCommand("admin.rider.block");
  const riders = stored.value;
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("Search by name, phone or trip id.");
  const [pending, setPending] = useState<Rider | null>(null);
  const found = findRiders(riders, query);

  async function replace(next: Rider, reason: string, before: string) {
    const rows = riders.map((rider) => (rider.id === next.id ? next : rider));
    await stored.save(rows, {
      targetId: next.id,
      reason,
      actorId: session.agent?.id ?? "nora",
      before,
      after: next.blocked ? "blocked" : "active",
    });
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Riders</h2>
          <p>Demo set: {seeded.data?.length ?? "…"} riders. Changes stay after reload.</p>
        </div>
      </div>
      <label>
        Search
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, phone or trip" />
      </label>
      <p className="state-line">{notice}</p>
      {found.map((rider) => (
        <article className="panel" key={rider.id}>
          <h3>
            {rider.name} · {rider.phone}
          </h3>
          <p>
            {rider.id} · trips {rider.tripIds.join(", ")} · {rider.blocked ? "blocked" : "active"} · privacy {rider.privacy} · sessions {rider.sessions} · wallet {rider.walletOre / 100} kr
          </p>
          <div className="actions">
            <button
              className="secondary-btn"
              type="button"
              onClick={() => setPending(rider)}
            >
              {rider.blocked ? "Unblock" : "Block"}
            </button>
            <button className="secondary-btn" type="button" onClick={() => { void replace(signOutRider(rider), "Sign out", `${rider.sessions} sessions`); setNotice("Signed out of all devices."); }}>
              Sign out
            </button>
            <button
              className="secondary-btn"
              type="button"
              onClick={() => {
                const result = creditWallet(rider, 10_000);
                if (result.error) setNotice(result.error);
                else {
                  replace(result.rider, "Wallet credit", `${rider.walletOre}`);
                  setNotice(command.message || "Wallet credited 100 kr.");
                }
              }}
            >
              Credit 100 kr
            </button>
            <button className="primary-btn" type="button" onClick={() => { void replace(advancePrivacy(rider), "Privacy step", rider.privacy); setNotice("Privacy request moved forward."); }}>
              Privacy step
            </button>
          </div>
        </article>
      ))}
      <ConfirmDialog
        open={pending !== null}
        record={pending ? `${pending.name} (${pending.id})` : ""}
        typed={pending?.id ?? ""}
        reasons={[...ACTION_REASONS]}
        onClose={() => setPending(null)}
        onConfirm={(reason) => {
          if (!pending) return;
          const result = blockRider(pending, !pending.blocked, reason);
          if (result.error) setNotice(result.error);
          else {
            void replace(result.rider, reason, pending.blocked ? "blocked" : "active");
            setNotice(result.rider.blocked ? "Rider blocked." : "Rider unblocked.");
          }
          setPending(null);
        }}
      />
    </>
  );
}
