import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useSession } from "../auth/SessionContext";
import {
  advanceConfigClock,
  approveConfig,
  configDiff,
  effectiveValue,
  emptyConfig,
  impactPreview,
  missingTranslations,
  normalizeConfig,
  publishConfig,
  REASON_GROUPS,
  removeOverride,
  rollbackConfig,
  setAppUpdate,
  setAppVersion,
  setEnvironment,
  setExpiry,
  setMaxStops,
  setOverride,
  setReason,
  setSchedule,
  setSwitch,
  setZoneOverride,
  submitConfigApproval,
  useRecords,
  useRevision,
  useSlice,
  type ConfigBook,
  type FeatureKey,
  type OverrideLevel,
} from "../api/hooks";
import { coreZones, stockholmZones } from "../zones/releases";
import { CommandButton } from "../ui/CommandButton";

const LEVELS: OverrideLevel[] = ["market", "zone", "category", "app", "platform", "appVersion", "cohort"];
const CATEGORIES = ["economy", "comfort", "premium", "priority", "xl", "electric", "pet"];

function platformName(app: string, platform: string): string {
  return `${app === "rider" ? "Rider" : "Driver"} ${platform === "ios" ? "iOS" : "Android"}`;
}

function localDateTime(iso: string | null): string {
  return iso ? iso.slice(0, 16) : "";
}

export function ConfigPage() {
  const { agent } = useSession();
  const fallback = useMemo(() => emptyConfig(agent?.id ?? "nora"), [agent?.id]);
  const slice = useSlice<ConfigBook>("config", fallback);
  const revision = useRevision();
  const staff = useRecords("staff", null);

  const [book, setBook] = useState<ConfigBook>(fallback);
  const [loaded, setLoaded] = useState(false);
  const [baseRevision, setBaseRevision] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("Draft is not live.");
  const [zoneId, setZoneId] = useState("op-norrmalm");

  const [previewKey, setPreviewKey] = useState<FeatureKey>("wallet");
  const [previewCategory, setPreviewCategory] = useState("premium");
  const [previewApp, setPreviewApp] = useState<"rider" | "driver">("rider");
  const [previewPlatform, setPreviewPlatform] = useState<"ios" | "android">("ios");
  const [previewVersion, setPreviewVersion] = useState("1.0.0");
  const [previewCohort, setPreviewCohort] = useState("all");

  const [overrideKey, setOverrideKey] = useState<FeatureKey>("wallet");
  const [overrideLevel, setOverrideLevel] = useState<OverrideLevel>("zone");
  const [overrideTarget, setOverrideTarget] = useState("op-norrmalm");
  const [overrideValue, setOverrideValue] = useState(true);
  const [overrideStarts, setOverrideStarts] = useState("");
  const [overrideExpires, setOverrideExpires] = useState("");

  useEffect(() => {
    if (loaded || slice.loading || revision.isLoading) return;
    setBook(normalizeConfig(slice.value));
    setBaseRevision(revision.data ?? 1);
    setLoaded(true);
  }, [loaded, revision.data, revision.isLoading, slice.loading, slice.value]);

  const zones = coreZones(stockholmZones());
  const override = book.draft.zoneOverrides[zoneId] ?? {};
  const missing = missingTranslations(book.draft.reasons);
  const diff = configDiff(book.published, book.draft);
  const impact = impactPreview(book);
  const preview = effectiveValue(book.draft, previewKey, {
    market: "SE-STO",
    zoneId,
    category: previewCategory,
    app: previewApp,
    platform: previewPlatform,
    appVersion: previewVersion,
    cohort: previewCohort === "all" ? undefined : previewCohort,
  });
  const reservations = effectiveValue(book.draft, "reservations", { market: "SE-STO", zoneId });
  const wallet = effectiveValue(book.draft, "wallet", { market: "SE-STO", zoneId });

  const reviewCandidate = agent ? submitConfigApproval(book, agent.id) : { book, error: "Sign in again." };
  const approveCandidate = agent ? approveConfig(book, agent.id) : { book, error: "Sign in again." };
  const publishNow = new Date().toISOString();
  const publishCandidate = agent ? publishConfig(book, agent.id, publishNow) : { book, error: "Sign in again." };
  const rollbackCandidate = agent ? rollbackConfig(book, agent.id, publishNow) : book;
  const clockCandidate = advanceConfigClock(book, publishNow);
  const clockChanges = JSON.stringify(clockCandidate) !== JSON.stringify(book);

  function edit(next: ConfigBook, text: string) {
    setBook(next);
    setDirty(true);
    setNotice(`${text} Unsaved draft.`);
  }

  function commandMeta(next: ConfigBook, after: string) {
    return {
      targetId: "config",
      before: `configuration rev ${book.rev}`,
      after,
      expectedRev: baseRevision ?? undefined,
      sliceKey: "config",
      value: next,
    };
  }

  if (!loaded) return <p className="state-line">Loading configuration.</p>;

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Configuration</h2>
          <p>
            Version {book.rev}. Status {book.status}. Rider {book.published.versions.rider}. Driver {book.published.versions.driver}.
            {" "}Staff {staff.data?.length ?? "…"}. Languages: Swedish and English. Luxury is not a feature.
          </p>
        </div>
        <Link to="/confirm">Open to confirm</Link>
      </div>

      <p className="state-line" data-config-dirty={dirty ? "yes" : "no"}>
        {notice}
        {dirty ? " Save the draft before review." : ""}
        {missing.length > 0 ? ` Missing translation: ${missing.join(", ")}.` : ""}
        {" "}Store revision {baseRevision ?? "…"}.
      </p>

      <article className="panel">
        <div className="panel-title-row">
          <div>
            <h3>Draft controls</h3>
            <p className="state-line">Draft edits stay local until Save draft. Saving uses the loaded revision, so a stale editor is refused instead of overwriting a newer change.</p>
          </div>
          <div className="actions">
            <CommandButton
              command="admin.config.save"
              className="primary-btn"
              type="button"
              disabled={!dirty || baseRevision === null}
              {...commandMeta(book, "configuration draft saved")}
              onDone={(result) => {
                setDirty(false);
                setBaseRevision(result.rev);
                setNotice("Draft saved through AdminApi.");
              }}
            >
              Save draft
            </CommandButton>
            <CommandButton
              command="admin.ui.retry"
              className="secondary-btn"
              type="button"
              onDone={() => window.location.reload()}
            >
              Reload latest
            </CommandButton>
          </div>
        </div>
      </article>

      <article className="panel">
        <h3>Version diff</h3>
        <ul aria-label="Configuration diff">
          {diff.length === 0 ? <li>No unpublished changes.</li> : diff.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </article>

      <article className="panel">
        <h3>Impact preview</h3>
        <p data-testid="config-impact">
          {impact.changed} changed areas · scopes {impact.scopes.join(", ")}.
          {impact.scheduledFor ? ` Scheduled ${impact.scheduledFor}.` : " Immediate publish."}
          {impact.expiresAt ? ` Expires ${impact.expiresAt}.` : " No expiry."}
        </p>
        {impact.missingTranslations.length > 0 ? <p className="state-line">Blocked by missing translations: {impact.missingTranslations.join(", ")}.</p> : null}
      </article>

      <article className="panel">
        <h3>Features</h3>
        <p className="state-line">Rider app</p>
        {book.draft.switches.filter((item) => item.app === "rider").map((item) => (
          <label className="check-row" key={item.id}>
            <input
              type="checkbox"
              checked={item.on}
              onChange={(event) => agent && edit(setSwitch(book, item.id, event.target.checked, agent.id), "Feature changed.")}
            />
            {item.label}
          </label>
        ))}
        <p className="state-line">Driver app</p>
        {book.draft.switches.filter((item) => item.app === "driver").map((item) => (
          <label className="check-row" key={item.id}>
            <input
              type="checkbox"
              checked={item.on}
              onChange={(event) => agent && edit(setSwitch(book, item.id, event.target.checked, agent.id), "Feature changed.")}
            />
            {item.label}
          </label>
        ))}
      </article>

      <article className="panel">
        <h3>App versions</h3>
        <div className="field-grid">
          <label>
            Rider app
            <input
              defaultValue={book.draft.versions.rider}
              key={`rider-${book.draft.versions.rider}`}
              onBlur={(event) => agent && event.target.value !== book.draft.versions.rider && edit(setAppVersion(book, "rider", event.target.value, agent.id), "Rider version changed.")}
            />
          </label>
          <label>
            Driver app
            <input
              defaultValue={book.draft.versions.driver}
              key={`driver-${book.draft.versions.driver}`}
              onBlur={(event) => agent && event.target.value !== book.draft.versions.driver && edit(setAppVersion(book, "driver", event.target.value, agent.id), "Driver version changed.")}
            />
          </label>
          {book.draft.updates.map((item) => {
            const name = platformName(item.app, item.platform);
            return (
              <div key={`${item.app}-${item.platform}`}>
                <label>
                  {name} minimum
                  <input
                    defaultValue={item.minimumVersion}
                    key={`${name}-min-${item.minimumVersion}`}
                    onBlur={(event) => agent && event.target.value !== item.minimumVersion && edit(setAppUpdate(book, item.app, item.platform, { minimumVersion: event.target.value }, agent.id), `${name} minimum changed.`)}
                  />
                </label>
                <label>
                  {name} latest
                  <input
                    defaultValue={item.latestVersion}
                    key={`${name}-latest-${item.latestVersion}`}
                    onBlur={(event) => agent && event.target.value !== item.latestVersion && edit(setAppUpdate(book, item.app, item.platform, { latestVersion: event.target.value }, agent.id), `${name} latest changed.`)}
                  />
                </label>
                <label>
                  {name} message
                  <input
                    defaultValue={item.message}
                    key={`${name}-msg-${item.message}`}
                    onBlur={(event) => agent && event.target.value !== item.message && edit(setAppUpdate(book, item.app, item.platform, { message: event.target.value }, agent.id), `${name} message changed.`)}
                  />
                </label>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={item.mandatory}
                    onChange={(event) => agent && edit(setAppUpdate(book, item.app, item.platform, { mandatory: event.target.checked }, agent.id), `${name} mandatory changed.`)}
                  />
                  {name} mandatory
                </label>
              </div>
            );
          })}
          <label>
            Publish at
            <input
              aria-label="Schedule"
              type="datetime-local"
              value={localDateTime(book.draft.scheduleAt)}
              onChange={(event) => {
                if (!agent) return;
                const scheduleAt = event.target.value ? new Date(event.target.value).toISOString() : null;
                edit(setSchedule(book, scheduleAt, agent.id), scheduleAt ? "Schedule changed." : "Schedule cleared.");
              }}
            />
          </label>
          <label>
            Expire at
            <input
              aria-label="Expiry"
              type="datetime-local"
              value={localDateTime(book.draft.expiresAt)}
              onChange={(event) => {
                if (!agent) return;
                const expiresAt = event.target.value ? new Date(event.target.value).toISOString() : null;
                edit(setExpiry(book, expiresAt, agent.id), expiresAt ? "Expiry changed." : "Expiry cleared.");
              }}
            />
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
                  <input
                    value={reason.sv}
                    onChange={(event) => agent && edit(setReason(book, reason.id, "sv", event.target.value, agent.id), "Swedish reason changed.")}
                  />
                </label>
                <label>
                  {reason.id} English
                  <input
                    value={reason.en}
                    onChange={(event) => agent && edit(setReason(book, reason.id, "en", event.target.value, agent.id), "English reason changed.")}
                  />
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
          <input
            type="number"
            min={0}
            value={book.draft.booking.maxStops}
            onChange={(event) => agent && edit(setMaxStops(book, Number(event.target.value), agent.id), "Max stops changed.")}
          />
        </label>
      </article>

      <article className="panel">
        <h3>Environment (test only)</h3>
        {(["simulatedArrival", "skipActivation", "demoPopup", "demoHint"] as const).map((key) => (
          <label className="check-row" key={key}>
            <input
              type="checkbox"
              checked={book.draft.environment[key]}
              onChange={(event) => agent && edit(setEnvironment(book, key, event.target.checked, agent.id), "Test environment changed.")}
            />
            {key === "simulatedArrival" ? "Simulated arrival (test only)" : key === "skipActivation" ? "Skip activation (test only)" : key === "demoPopup" ? "Demo popup (test only)" : "Demo hint (test only)"}
          </label>
        ))}
      </article>

      <article className="panel">
        <h3>Zone compatibility overrides</h3>
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
            onChange={(event) => agent && edit(setZoneOverride(book, zoneId, "reservations", event.target.checked, agent.id), "Zone reservations override changed.")}
          />
          Reservations in this zone
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={override.wallet ?? book.draft.features.wallet}
            onChange={(event) => agent && edit(setZoneOverride(book, zoneId, "wallet", event.target.checked, agent.id), "Zone wallet override changed.")}
          />
          Wallet in this zone
        </label>
      </article>

      <article className="panel">
        <h3>Advanced precedence</h3>
        <p className="state-line">Highest matching level wins: global → market → zone → category → app → platform → app version → cohort. Timed overrides are ignored outside their active window.</p>
        <div className="field-grid">
          <label>
            Feature
            <select aria-label="Override feature" value={overrideKey} onChange={(event) => setOverrideKey(event.target.value as FeatureKey)}>
              <option value="wallet">Wallet</option>
              <option value="reservations">Reservations</option>
            </select>
          </label>
          <label>
            Level
            <select aria-label="Override level" value={overrideLevel} onChange={(event) => setOverrideLevel(event.target.value as OverrideLevel)}>
              {LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
          </label>
          <label>
            Target
            <input aria-label="Override target" value={overrideTarget} onChange={(event) => setOverrideTarget(event.target.value)} />
          </label>
          <label>
            Value
            <select aria-label="Override value" value={overrideValue ? "on" : "off"} onChange={(event) => setOverrideValue(event.target.value === "on")}>
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </label>
          <label>
            Starts at
            <input aria-label="Override starts" type="datetime-local" value={overrideStarts} onChange={(event) => setOverrideStarts(event.target.value)} />
          </label>
          <label>
            Expires at
            <input aria-label="Override expires" type="datetime-local" value={overrideExpires} onChange={(event) => setOverrideExpires(event.target.value)} />
          </label>
        </div>
        <button
          data-command="admin.config.save"
          className="secondary-btn"
          type="button"
          disabled={!agent || !overrideTarget.trim()}
          onClick={() => {
            if (!agent || !overrideTarget.trim()) return;
            const id = `${overrideLevel}-${overrideTarget.trim()}-${overrideKey}`;
            edit(setOverride(book, {
              id,
              key: overrideKey,
              level: overrideLevel,
              target: overrideTarget.trim(),
              value: overrideValue,
              startsAt: overrideStarts ? new Date(overrideStarts).toISOString() : null,
              expiresAt: overrideExpires ? new Date(overrideExpires).toISOString() : null,
            }, agent.id), "Precedence override changed.");
          }}
        >
          Add or replace override
        </button>

        {book.draft.overrides.length === 0 ? <p className="state-line">No advanced overrides.</p> : (
          <ul className="version-list" aria-label="Advanced overrides">
            {book.draft.overrides.map((item) => (
              <li key={item.id}>
                {item.key} · {item.level}:{item.target} · {item.value ? "on" : "off"}
                {item.startsAt ? ` · starts ${item.startsAt}` : ""}
                {item.expiresAt ? ` · expires ${item.expiresAt}` : ""}
                {" "}
                <button
                  data-command="admin.config.save"
                  className="link-action danger-text"
                  type="button"
                  onClick={() => agent && edit(removeOverride(book, item.id, agent.id), "Override removed.")}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <h4>Effective value viewer</h4>
        <div className="field-grid">
          <label>
            Feature
            <select aria-label="Preview feature" value={previewKey} onChange={(event) => setPreviewKey(event.target.value as FeatureKey)}>
              <option value="wallet">Wallet</option>
              <option value="reservations">Reservations</option>
            </select>
          </label>
          <label>
            Category
            <select aria-label="Preview category" value={previewCategory} onChange={(event) => setPreviewCategory(event.target.value)}>
              {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <label>
            App
            <select aria-label="Preview app" value={previewApp} onChange={(event) => setPreviewApp(event.target.value as "rider" | "driver")}>
              <option value="rider">Rider</option>
              <option value="driver">Driver</option>
            </select>
          </label>
          <label>
            Platform
            <select aria-label="Preview platform" value={previewPlatform} onChange={(event) => setPreviewPlatform(event.target.value as "ios" | "android")}>
              <option value="ios">iOS</option>
              <option value="android">Android</option>
            </select>
          </label>
          <label>
            App version
            <input aria-label="Preview app version" value={previewVersion} onChange={(event) => setPreviewVersion(event.target.value)} />
          </label>
          <label>
            Cohort
            <input aria-label="Preview cohort" value={previewCohort} onChange={(event) => setPreviewCohort(event.target.value)} />
          </label>
        </div>
        <p className="state-line" data-testid="effective-precedence">
          Effective {previewKey}: {preview.value}. Winning level: {preview.level}. {preview.chain.join(" → ")}
        </p>
      </article>

      <article className="panel">
        <h3>Scheduled versions</h3>
        {book.scheduled.length === 0 ? <p className="state-line">No scheduled versions.</p> : (
          <ul className="version-list" aria-label="Scheduled versions">
            {book.scheduled.map((item) => (
              <li key={item.rev}>Version {item.rev} · live {item.effectiveAt}{item.expiresAt ? ` · expires ${item.expiresAt}` : ""}</li>
            ))}
          </ul>
        )}
        <CommandButton
          command="admin.config.save"
          className="secondary-btn"
          type="button"
          disabled={!clockChanges || dirty || baseRevision === null}
          {...commandMeta(clockCandidate, "due configuration schedules evaluated")}
          onDone={(result) => {
            setBook(clockCandidate);
            setBaseRevision(result.rev);
            setNotice("Due scheduled changes and expiries evaluated.");
          }}
        >
          Apply due schedules
        </CommandButton>
      </article>

      <article className="panel">
        <h3>Publish history</h3>
        <ol aria-label="Publish history">
          {book.publications.length === 0 ? <li>No publishes yet.</li> : book.publications.map((item, index) => (
            <li key={`${item.rev}-${item.kind ?? "publish"}-${index}`}>
              Version {item.rev} · {item.kind ?? "publish"} by {item.actorId}: {item.diff.join("; ") || "no diff"}
              {item.effectiveAt ? ` · effective ${item.effectiveAt}` : ""}
              {item.expiresAt ? ` · expires ${item.expiresAt}` : ""}
            </li>
          ))}
        </ol>
      </article>

      <article className="panel">
        <div className="actions">
          <CommandButton
            command="admin.config.review"
            className="secondary-btn"
            type="button"
            disabled={dirty || !!reviewCandidate.error || baseRevision === null}
            title={dirty ? "Save the draft first." : reviewCandidate.error}
            {...commandMeta(reviewCandidate.book, "configuration sent for approval")}
            onDone={(result) => {
              setBook(reviewCandidate.book);
              setBaseRevision(result.rev);
              setNotice("Sent for approval.");
            }}
          >
            Send for approval
          </CommandButton>

          <CommandButton
            command="admin.config.approve"
            className="secondary-btn"
            type="button"
            disabled={dirty || !!approveCandidate.error || baseRevision === null}
            title={dirty ? "Save the draft first." : approveCandidate.error}
            {...commandMeta(approveCandidate.book, "configuration approved")}
            onDone={(result) => {
              setBook(approveCandidate.book);
              setBaseRevision(result.rev);
              setNotice("Approved. A second agent can publish.");
            }}
          >
            Approve
          </CommandButton>

          <CommandButton
            command="admin.config.publish"
            className="primary-btn"
            type="button"
            disabled={dirty || !!publishCandidate.error || baseRevision === null}
            title={dirty ? "Save the draft first." : publishCandidate.error}
            {...commandMeta(publishCandidate.book, publishCandidate.scheduled ? "configuration scheduled" : "configuration published")}
            onDone={(result) => {
              setBook(publishCandidate.book);
              setBaseRevision(result.rev);
              setNotice(publishCandidate.scheduled ? "Scheduled version created. It is not live yet." : `Published version ${publishCandidate.book.rev}.`);
            }}
          >
            Publish
          </CommandButton>

          <CommandButton
            command="admin.config.rollback"
            className="secondary-btn"
            type="button"
            disabled={dirty || book.history.length < 2 || baseRevision === null}
            title={dirty ? "Save or discard the draft first." : book.history.length < 2 ? "No previous published version." : undefined}
            {...commandMeta(rollbackCandidate, "configuration rolled back as a new version")}
            onDone={(result) => {
              setBook(rollbackCandidate);
              setBaseRevision(result.rev);
              setNotice(`Rolled back as version ${rollbackCandidate.rev}.`);
            }}
          >
            Roll back
          </CommandButton>
        </div>
      </article>
    </>
  );
}
