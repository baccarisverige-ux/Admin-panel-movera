import { useState } from "react";
import { useSession } from "../auth/SessionContext";
import {
  configDiff,
  emptyConfig,
  missingTranslations,
  publishConfig,
  rollbackConfig,
  setAppVersion,
  setFeature,
  setReason,
  setSchedule,
  setZoneOverride,
  useRecords,
  type ConfigBook,
} from "../api/hooks";
import { coreZones, stockholmZones } from "../zones/releases";
import { CommandButton } from "../ui/CommandButton";

const STORE_KEY = "movera-admin-config-v2";

function load(): ConfigBook {
  const raw = localStorage.getItem(STORE_KEY);
  const base = emptyConfig();
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as ConfigBook;
    if (!parsed?.draft || !parsed.published) return base;
    return {
      ...base,
      ...parsed,
      draft: { ...base.draft, ...parsed.draft, features: { ...parsed.draft.features, luxury: false }, zoneOverrides: parsed.draft.zoneOverrides ?? {} },
      published: { ...base.published, ...parsed.published, features: { ...parsed.published.features, luxury: false }, zoneOverrides: parsed.published.zoneOverrides ?? {} },
    };
  } catch {
    return base;
  }
}

export function ConfigPage() {
  const { agent } = useSession();
  const [book, setBook] = useState<ConfigBook>(() => load());
  const [notice, setNotice] = useState("Draft is not live.");
  const [zoneId, setZoneId] = useState("op-norrmalm");
  const missing = missingTranslations(book.draft.reasons);
  const staff = useRecords("staff", null);
  const diff = configDiff(book.published, book.draft);
  const zones = coreZones(stockholmZones());
  const override = book.draft.zoneOverrides[zoneId] ?? {};

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
          <p>Version {book.rev}. Rider {book.published.versions.rider}. Driver {book.published.versions.driver}. Staff {staff.data?.length ?? "…"}. Languages: Swedish and English. Luxury is not a feature.</p>
        </div>
      </div>
      <p className="state-line">{notice}{missing.length > 0 ? ` Missing translation: ${missing.join(", ")}.` : ""}</p>
      <article className="panel">
        <h3>Draft diff</h3>
        <ul aria-label="Configuration diff">
          {diff.length === 0 ? <li>No unpublished changes.</li> : diff.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </article>
      <article className="panel">
        <h3>Features</h3>
        <label className="check-row">
          <input type="checkbox" checked={book.draft.features.reservations} onChange={(event) => agent && save(setFeature(book, "reservations", event.target.checked, agent.id), "Draft saved. Not published.")} />
          Reservations
        </label>
        <label className="check-row">
          <input type="checkbox" checked={book.draft.features.wallet} onChange={(event) => agent && save(setFeature(book, "wallet", event.target.checked, agent.id), "Draft saved. Not published.")} />
          Wallet
        </label>
        <div className="field-grid">
          <label>
            Rider app
            <input defaultValue={book.draft.versions.rider} key={book.draft.versions.rider} onBlur={(event) => agent && event.target.value !== book.draft.versions.rider && save(setAppVersion(book, "rider", event.target.value, agent.id), "Draft saved. Not published.")} />
          </label>
          <label>
            Driver app
            <input defaultValue={book.draft.versions.driver} key={book.draft.versions.driver} onBlur={(event) => agent && event.target.value !== book.draft.versions.driver && save(setAppVersion(book, "driver", event.target.value, agent.id), "Draft saved. Not published.")} />
          </label>
          <label>
            Schedule
            <input type="datetime-local" value={book.draft.scheduleAt ? book.draft.scheduleAt.slice(0, 16) : ""} onChange={(event) => {
              if (!agent) return;
              const scheduleAt = event.target.value ? new Date(event.target.value).toISOString() : null;
              save(setSchedule(book, scheduleAt, agent.id), scheduleAt ? "Scheduled. Not live until that time." : "Schedule cleared.");
            }} />
          </label>
        </div>
      </article>
      <article className="panel">
        <h3>Reasons</h3>
        {book.draft.reasons.map((reason) => (
          <div className="field-grid" key={reason.id}>
            <label>
              {reason.id} Swedish
              <input value={reason.sv} onChange={(event) => agent && save(setReason(book, reason.id, "sv", event.target.value, agent.id), "Draft saved. Not published.")} />
            </label>
            <label>
              {reason.id} English
              <input value={reason.en} onChange={(event) => agent && save(setReason(book, reason.id, "en", event.target.value, agent.id), "Draft saved. Not published.")} />
            </label>
          </div>
        ))}
      </article>
      <article className="panel">
        <h3>Per-zone override</h3>
        <label>
          Zone override
          <select aria-label="Zone override" value={zoneId} onChange={(event) => setZoneId(event.target.value)}>
            {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
          </select>
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={override.reservations ?? book.draft.features.reservations}
            onChange={(event) => agent && save(setZoneOverride(book, zoneId, "reservations", event.target.checked, agent.id), "Zone override saved in the draft.")}
          />
          Reservations in this zone
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={override.wallet ?? book.draft.features.wallet}
            onChange={(event) => agent && save(setZoneOverride(book, zoneId, "wallet", event.target.checked, agent.id), "Zone override saved in the draft.")}
          />
          Wallet in this zone
        </label>
      </article>
      <article className="panel">
        <div className="actions">
          <CommandButton command="admin.config.publish" className="primary-btn" type="button" onDone={() => {
            if (!agent) return;
            const result = publishConfig(book, agent.id, new Date().toISOString());
            if (result.error) setNotice(result.error);
            else save(result.book, `Published version ${result.book.rev}.`);
          }}>
            Publish
          </CommandButton>
          <CommandButton command="admin.config.rollback" className="secondary-btn" type="button" onDone={() => save(rollbackConfig(book), "Rolled back.")}>
            Roll back
          </CommandButton>
        </div>
      </article>
    </>
  );
}
