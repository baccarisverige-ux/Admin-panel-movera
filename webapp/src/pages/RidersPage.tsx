import { useState } from "react";
import { advancePrivacy, blockRider, creditWallet, findRiders, RIDERS, signOutRider, type Rider } from "../riders/book";

export function RidersPage() {
  const [riders, setRiders] = useState<Rider[]>(RIDERS);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("Search by name, phone or trip id.");
  const found = findRiders(riders, query);

  function replace(next: Rider) {
    setRiders(riders.map((rider) => (rider.id === next.id ? next : rider)));
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Riders</h2>
          <p>Block, sign-out, wallet credit and privacy requests.</p>
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
              onClick={() => {
                const result = blockRider(rider, !rider.blocked, rider.blocked ? "Appeal accepted" : "Safety review");
                if (result.error) setNotice(result.error);
                else {
                  replace(result.rider);
                  setNotice(result.rider.blocked ? "Rider blocked." : "Rider unblocked.");
                }
              }}
            >
              {rider.blocked ? "Unblock" : "Block"}
            </button>
            <button className="secondary-btn" type="button" onClick={() => { replace(signOutRider(rider)); setNotice("Signed out of all devices."); }}>
              Sign out
            </button>
            <button
              className="secondary-btn"
              type="button"
              onClick={() => {
                const result = creditWallet(rider, 10_000);
                if (result.error) setNotice(result.error);
                else {
                  replace(result.rider);
                  setNotice("Wallet credited 100 kr.");
                }
              }}
            >
              Credit 100 kr
            </button>
            <button className="primary-btn" type="button" onClick={() => { replace(advancePrivacy(rider)); setNotice("Privacy request moved forward."); }}>
              Privacy step
            </button>
          </div>
        </article>
      ))}
    </>
  );
}
