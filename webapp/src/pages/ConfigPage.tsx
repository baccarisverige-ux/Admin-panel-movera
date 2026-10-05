import { useState } from "react";
import { useSession } from "../auth/SessionContext";
import { emptyConfig, missingTranslations, publishConfig, rollbackConfig, setFeature, useRecords, type ConfigBook } from "../api/hooks";

const STORE_KEY = "movera-admin-config";

function load(): ConfigBook {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return emptyConfig();
  try {
    return JSON.parse(raw) as ConfigBook;
  } catch {
    return emptyConfig();
  }
}

export function ConfigPage() {
  const { agent } = useSession();
  const [book, setBook] = useState<ConfigBook>(() => load());
  const [notice, setNotice] = useState("Draft is not live.");
  const missing = missingTranslations(book.draft.reasons);
  const staff = useRecords("staff", null);

  function save(next: ConfigBook, text: string) {
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
    setBook(next);
    setNotice(text);
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Configuration</h2>
          <p>Version {book.rev}. Rider {book.published.versions.rider}. Driver {book.published.versions.driver}. Staff {staff.data?.length ?? "…"}. Luxury is not a feature.</p>
        </div>
      </div>
      <p className="state-line">{notice}{missing.length > 0 ? ` Missing translation: ${missing.join(", ")}.` : ""}</p>
      <article className="panel">
        <label>
          <input
            type="checkbox"
            checked={book.draft.features.reservations}
            onChange={(event) => agent && save(setFeature(book, "reservations", event.target.checked, agent.id), "Draft saved. Not published.")}
          />
          Reservations
        </label>
        <label>
          <input
            type="checkbox"
            checked={book.draft.features.wallet}
            onChange={(event) => agent && save(setFeature(book, "wallet", event.target.checked, agent.id), "Draft saved. Not published.")}
          />
          Wallet
        </label>
        <div className="actions">
          <button
            className="primary-btn"
            type="button"
            onClick={() => {
              if (!agent) return;
              const result = publishConfig(book, agent.id, new Date().toISOString());
              if (result.error) setNotice(result.error);
              else save(result.book, "Published.");
            }}
          >
            Publish
          </button>
          <button className="secondary-btn" type="button" onClick={() => save(rollbackConfig(book), "Rolled back.")}>
            Roll back
          </button>
        </div>
        <ul>
          {book.draft.reasons.map((reason) => (
            <li key={reason.id}>
              {reason.id}: {reason.sv} / {reason.en}
            </li>
          ))}
        </ul>
      </article>
    </>
  );
}
