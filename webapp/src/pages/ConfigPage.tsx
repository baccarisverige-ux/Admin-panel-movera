import { useState } from "react";
import { Link } from "react-router";
import { useSession } from "../auth/SessionContext";
import {
  approveConfig,
  configDiff,
  effectiveValue,
  emptyConfig,
  missingTranslations,
  normalizeConfig,
  publishConfig,
  REASON_GROUPS,
  rollbackConfig,
  setAppUpdate,
  setAppVersion,
  setEnvironment,
  setMaxStops,
  setReason,
  setSchedule,
  setSwitch,
  setZoneOverride,
  submitConfigApproval,
  useRecords,
  type ConfigBook,
} from "../api/hooks";
import { coreZones, stockholmZones } from "../zones/releases";
import { CommandButton } from "../ui/CommandButton";

const STORE_KEY = "movera-admin-config-v3";

function load(): ConfigBook {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return emptyConfig();
  try {
    return normalizeConfig(JSON.parse(raw) as ConfigBook);
  } catch {
    return emptyConfig();
  }
}

function platformName(app: string, platform: string): string {
  return `${app === "rider" ? "Rider" : "Driver"} ${platform === "ios" ? "iOS" : "Android"}`;
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
  const reservations = effectiveValue(book.draft, "reservations", zoneId);
  const wallet = effectiveValue(book.draft, "wallet", zoneId);

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
          <p>Version {book.rev}. Status {book.status}. Rider {book.published.versions.rider}. Driver {book.published.versions.driver}. Staff {staff.data?.length ?? "…"}. Languages: Swedish and English. Luxury is not a feature.</p>
        </div>
        <Link to="/confirm">Open to confirm</Link>
      </div>
      <p className="state-line">{notice}{missing.length > 0 ? ` Missing translation: ${missing.join(", ")}.` : ""}</p>
      <article className="panel">
        <h3>Version diff</h3>
        <ul aria-label="Configuration diff">
          {diff.length === 0 ? <li>No unpublished changes.</li> : diff.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </article>
      <article className="panel">
        <h3>Features</h3>
        <p className="state-line">Rider app</p>
        {book.draft.switches.filter((item) => item.app === "rider").map((item) => (
          <label className="check-row" key={item.id}>
            <input type="checkbox" checked={item.on} onChange={(event) => agent && save(setSwitch(book, item.id, event.target.checked, agent.id), "Draft saved. Not published.")} />
            {item.label}
          </label>
        ))}
        <p className="state-line">Driver app</p>
        {book.draft.switches.filter((item) => item.app === "driver").map((item) => (
          <label className="check-row" key={item.id}>
            <input type="checkbox" checked={item.on} onChange={(event) => agent && save(setSwitch(book, item.id, event.target.checked, agent.id), "Draft saved. Not published.")} />
            {item.label}
          </label>
        ))}
      </article>
      <article className="panel">
        <h3>App versions</h3>
        <div className="field-grid">
          <label>
            Rider app
            <input defaultValue={book.draft.versions.rider} key={`rider-${book.draft.versions.rider}`} onBlur={(event) => agent && event.target.value !== book.draft.versions.rider && save(setAppVersion(book, "rider", event.target.value, agent.id), "Draft saved. Not published.")} />
          </label>
          <label>
            Driver app
            <input defaultValue={book.draft.versions.driver} key={`driver-${book.draft.versions.driver}`} onBlur={(event) => agent && event.target.value !== book.draft.versions.driver && save(setAppVersion(book, "driver", event.target.value, agent.id), "Draft saved. Not published.")} />
          </label>
          {book.draft.updates.map((item) => {
            const name = platformName(item.app, item.platform);
            return (
              <div key={`${item.app}-${item.platform}`}>
                <label>
                  {name} minimum
                  <input defaultValue={item.minimumVersion} key={`${name}-min-${item.minimumVersion}`} onBlur={(event) => agent && event.target.value !== item.minimumVersion && save(setAppUpdate(book, item.app, item.platform, { minimumVersion: event.target.value }, agent.id), "Draft saved. Not published.")} />
                </label>
                <label>
                  {name} latest
                  <input defaultValue={item.latestVersion} key={`${name}-latest-${item.latestVersion}`} onBlur={(event) => agent && event.target.value !== item.latestVersion && save(setAppUpdate(book, item.app, item.platform, { latestVersion: event.target.value }, agent.id), "Draft saved. Not published.")} />
                </label>
                <label>
                  {name} message
                  <input defaultValue={item.message} key={`${name}-msg-${item.message}`} onBlur={(event) => agent && event.target.value !== item.message && save(setAppUpdate(book, item.app, item.platform, { message: event.target.value }, agent.id), "Draft saved. Not published.")} />
                </label>
                <label className="check-row">
                  <input type="checkbox" checked={item.mandatory} onChange={(event) => agent && save(setAppUpdate(book, item.app, item.platform, { mandatory: event.target.checked }, agent.id), "Draft saved. Not published.")} />
                  {name} mandatory
                </label>
              </div>
            );
          })}
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
        {REASON_GROUPS.map((group) => (
          <details key={group.id} open>
            <summary>{group.label}</summary>
            {book.draft.reasons.filter((reason) => reason.group === group.id).map((reason) => (
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
          </details>
        ))}
      </article>
      <article className="panel">
        <h3>Booking rules</h3>
        <label>
          Max stops
          <input type="number" min={0} value={book.draft.booking.maxStops} onChange={(event) => agent && save(setMaxStops(book, Number(event.target.value), agent.id), "Draft saved. Not published.")} />
        </label>
      </article>
      <article className="panel">
        <h3>Environment (test only)</h3>
        <label className="check-row">
          <input type="checkbox" checked={book.draft.environment.simulatedArrival} onChange={(event) => agent && save(setEnvironment(book, "simulatedArrival", event.target.checked, agent.id), "Draft saved. Not published.")} />
          Simulated arrival (test only)
        </label>
        <label className="check-row">
          <input type="checkbox" checked={book.draft.environment.skipActivation} onChange={(event) => agent && save(setEnvironment(book, "skipActivation", event.target.checked, agent.id), "Draft saved. Not published.")} />
          Skip activation (test only)
        </label>
        <label className="check-row">
          <input type="checkbox" checked={book.draft.environment.demoPopup} onChange={(event) => agent && save(setEnvironment(book, "demoPopup", event.target.checked, agent.id), "Draft saved. Not published.")} />
          Demo popup (test only)
        </label>
        <label className="check-row">
          <input type="checkbox" checked={book.draft.environment.demoHint} onChange={(event) => agent && save(setEnvironment(book, "demoHint", event.target.checked, agent.id), "Draft saved. Not published.")} />
          Demo hint (test only)
        </label>
      </article>
      <article className="panel">
        <h3>Effective value</h3>
        <label>
          Zone override
          <select aria-label="Zone override" value={zoneId} onChange={(event) => setZoneId(event.target.value)}>
            {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
          </select>
        </label>
        <p className="state-line" data-effective={reservations.level}>Effective reservations: {reservations.value}. Winning level: {reservations.level}. {reservations.chain.join(" · ")}</p>
        <p className="state-line" data-effective-wallet={wallet.level}>Effective wallet: {wallet.value}. Winning level: {wallet.level}. {wallet.chain.join(" · ")}</p>
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
        <h3>Publish history</h3>
        <ol aria-label="Publish history">
          {book.publications.length === 0 ? <li>No publishes yet.</li> : book.publications.map((item) => (
            <li key={item.rev}>Version {item.rev} by {item.actorId}: {item.diff.join("; ") || "no diff"}</li>
          ))}
        </ol>
      </article>
      <article className="panel">
        <div className="actions">
          <CommandButton command="admin.config.review" className="secondary-btn" type="button" onDone={() => {
            if (!agent) return;
            const result = submitConfigApproval(book, agent.id);
            if (result.error) setNotice(result.error);
            else save(result.book, "Sent for approval.");
          }}>
            Send for approval
          </CommandButton>
          <CommandButton command="admin.config.approve" className="secondary-btn" type="button" onDone={() => {
            if (!agent) return;
            const result = approveConfig(book, agent.id);
            if (result.error) setNotice(result.error);
            else save(result.book, "Approved. A second agent can publish.");
          }}>
            Approve
          </CommandButton>
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
