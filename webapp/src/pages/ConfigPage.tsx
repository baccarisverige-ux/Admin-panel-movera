import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useSession } from "../auth/SessionContext";
import {
  advanceConfigClock,
  approveConfig,
  configDiff,
  draftRevisionMatches,
  effectiveValue,
  emptyConfig,
  impactPreview,
  missingTranslations,
  normalizeConfig,
  publishConfig,
  removeOverride,
  REASON_GROUPS,
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
  type ConfigBook,
  type EffectiveContext,
  type FeatureKey,
  type OverrideLevel,
} from "../api/hooks";
import { CATEGORIES } from "../domain/contract";
import { coreZones, stockholmZones } from "../zones/releases";
import { CommandButton } from "../ui/CommandButton";

const STORE_KEY = "movera-admin-config-v3";
const LEVELS: OverrideLevel[] = ["market", "zone", "category", "app", "platform", "appVersion", "cohort"];

function load(): ConfigBook {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return emptyConfig();
  try {
    const normalized = normalizeConfig(JSON.parse(raw) as ConfigBook);
    const advanced = advanceConfigClock(normalized, new Date().toISOString());
    if (JSON.stringify(advanced) !== JSON.stringify(normalized)) {
      localStorage.setItem(STORE_KEY, JSON.stringify(advanced));
    }
    return advanced;
  } catch {
    return emptyConfig();
  }
}

function readStored(): ConfigBook | null {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return null;
  try {
    return normalizeConfig(JSON.parse(raw) as ConfigBook);
  } catch {
    return null;
  }
}

function platformName(app: string, platform: string): string {
  return `${app === "rider" ? "Rider" : "Driver"} ${platform === "ios" ? "iOS" : "Android"}`;
}

function defaultTarget(level: OverrideLevel, zoneId: string, book: ConfigBook): string {
  if (level === "market") return "SE-STO";
  if (level === "zone") return zoneId;
  if (level === "category") return "economy";
  if (level === "app") return "rider";
  if (level === "platform") return "ios";
  if (level === "appVersion") return book.draft.versions.rider;
  return "beta";
}

function targetOptions(level: OverrideLevel, book: ConfigBook): { value: string; label: string }[] {
  if (level === "market") return [{ value: "SE-STO", label: "Stockholm market" }];
  if (level === "zone") {
    return coreZones(stockholmZones()).map((zone) => ({ value: zone.id, label: zone.name }));
  }
  if (level === "category") return CATEGORIES.map((item) => ({ value: item.id, label: item.label }));
  if (level === "app") return [{ value: "rider", label: "Rider" }, { value: "driver", label: "Driver" }];
  if (level === "platform") return [{ value: "ios", label: "iOS" }, { value: "android", label: "Android" }];
  if (level === "appVersion") {
    return [
      { value: book.draft.versions.rider, label: `Rider ${book.draft.versions.rider}` },
      { value: book.draft.versions.driver, label: `Driver ${book.draft.versions.driver}` },
    ];
  }
  return [{ value: "beta", label: "beta" }, { value: "staff", label: "staff" }, { value: "new-riders", label: "new-riders" }];
}

function isoFromLocal(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function localFromIso(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function ConfigPage() {
  const { agent } = useSession();
  const [book, setBook] = useState<ConfigBook>(() => load());
  const [notice, setNotice] = useState("Draft is not live.");
  const [zoneId, setZoneId] = useState("op-norrmalm");
  const [featureKey, setFeatureKey] = useState<FeatureKey>("wallet");
  const [level, setLevel] = useState<OverrideLevel>("market");
  const [target, setTarget] = useState("SE-STO");
  const [overrideValue, setOverrideValue] = useState(true);
  const [startsAt, setStartsAt] = useState("");
  const [ruleExpiresAt, setRuleExpiresAt] = useState("");
  const [context, setContext] = useState<EffectiveContext>({
    market: "SE-STO",
    zoneId: "op-norrmalm",
    category: "economy",
    app: "rider",
    platform: "ios",
    appVersion: "1.0.0",
    cohort: "beta",
  });

  const missing = missingTranslations(book.draft.reasons);
  const staff = useRecords("staff", null);
  const diff = configDiff(book.published, book.draft);
  const zones = coreZones(stockholmZones());
  const legacyOverride = book.draft.zoneOverrides[zoneId] ?? {};
  const preview = useMemo(() => impactPreview(book), [book]);
  const reservations = effectiveValue(book.draft, "reservations", context);
  const wallet = effectiveValue(book.draft, "wallet", context);
  const options = targetOptions(level, book);

  function save(next: ConfigBook, text: string): boolean {
    const latest = readStored();
    if (latest && (!draftRevisionMatches(latest, book.draftRev) || latest.rev !== book.rev)) {
      setBook(latest);
      setNotice(`Conflict: another agent changed configuration. Reloaded version ${latest.rev}, draft ${latest.draftRev}; review before editing again.`);
      return false;
    }
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
    setBook(next);
    setNotice(text);
    return true;
  }

  function mutate(build: (current: ConfigBook) => ConfigBook, text: string) {
    if (!agent) return;
    save(build(book), text);
  }

  function changeLevel(next: OverrideLevel) {
    setLevel(next);
    setTarget(defaultTarget(next, zoneId, book));
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Configuration</h2>
          <p>
            Published version {book.rev}. Draft revision {book.draftRev}. Status {book.status}. Rider {book.published.versions.rider}.
            Driver {book.published.versions.driver}. Staff {staff.data?.length ?? "…"}. Languages: Swedish and English.
          </p>
        </div>
        <Link to="/confirm">Open to confirm</Link>
      </div>

      <p className="state-line">
        {notice}
        {missing.length > 0 ? ` Missing translation: ${missing.join(", ")}.` : ""}
      </p>

      <article className="panel">
        <h3>Impact preview</h3>
        <div className="field-grid">
          <label>Changed items<input readOnly value={preview.changed} /></label>
          <label>Affected scopes<input readOnly value={preview.scopes.join(", ")} /></label>
          <label>Scheduled for<input readOnly value={preview.scheduledFor ?? "Now after approval"} /></label>
          <label>Expires at<input readOnly value={preview.expiresAt ?? "No expiry"} /></label>
        </div>
        <p className="state-line">
          {preview.missingTranslations.length
            ? `Publish blocked: missing ${preview.missingTranslations.join(", ")}.`
            : "Translation coverage is complete."}
        </p>
        <ul aria-label="Configuration diff">
          {diff.length === 0 ? <li>No unpublished changes.</li> : diff.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </article>

      <article className="panel">
        <h3>Features</h3>
        <p className="state-line">Rider app</p>
        {book.draft.switches.filter((item) => item.app === "rider").map((item) => (
          <label className="check-row" key={item.id}>
            <input
              type="checkbox"
              checked={item.on}
              onChange={(event) => mutate(
                (current) => setSwitch(current, item.id, event.target.checked, agent!.id),
                "Draft saved. Not published.",
              )}
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
              onChange={(event) => mutate(
                (current) => setSwitch(current, item.id, event.target.checked, agent!.id),
                "Draft saved. Not published.",
              )}
            />
            {item.label}
          </label>
        ))}
      </article>

      <article className="panel">
        <h3>App versions and lifecycle</h3>
        <div className="field-grid">
          <label>
            Rider app
            <input
              defaultValue={book.draft.versions.rider}
              key={`rider-${book.draft.versions.rider}`}
              onBlur={(event) => {
                if (!agent || event.target.value === book.draft.versions.rider) return;
                mutate((current) => setAppVersion(current, "rider", event.target.value, agent.id), "Draft saved. Not published.");
                setContext((current) => ({ ...current, appVersion: event.target.value }));
              }}
            />
          </label>
          <label>
            Driver app
            <input
              defaultValue={book.draft.versions.driver}
              key={`driver-${book.draft.versions.driver}`}
              onBlur={(event) => {
                if (!agent || event.target.value === book.draft.versions.driver) return;
                mutate((current) => setAppVersion(current, "driver", event.target.value, agent.id), "Draft saved. Not published.");
              }}
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
                    onBlur={(event) => {
                      if (!agent || event.target.value === item.minimumVersion) return;
                      mutate(
                        (current) => setAppUpdate(current, item.app, item.platform, { minimumVersion: event.target.value }, agent.id),
                        "Draft saved. Not published.",
                      );
                    }}
                  />
                </label>
                <label>
                  {name} latest
                  <input
                    defaultValue={item.latestVersion}
                    key={`${name}-latest-${item.latestVersion}`}
                    onBlur={(event) => {
                      if (!agent || event.target.value === item.latestVersion) return;
                      mutate(
                        (current) => setAppUpdate(current, item.app, item.platform, { latestVersion: event.target.value }, agent.id),
                        "Draft saved. Not published.",
                      );
                    }}
                  />
                </label>
                <label>
                  {name} message
                  <input
                    defaultValue={item.message}
                    key={`${name}-msg-${item.message}`}
                    onBlur={(event) => {
                      if (!agent || event.target.value === item.message) return;
                      mutate(
                        (current) => setAppUpdate(current, item.app, item.platform, { message: event.target.value }, agent.id),
                        "Draft saved. Not published.",
                      );
                    }}
                  />
                </label>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={item.mandatory}
                    onChange={(event) => agent && mutate(
                      (current) => setAppUpdate(current, item.app, item.platform, { mandatory: event.target.checked }, agent.id),
                      "Draft saved. Not published.",
                    )}
                  />
                  {name} mandatory
                </label>
              </div>
            );
          })}

          <label>
            Publish schedule
            <input
              aria-label="Publish schedule"
              type="datetime-local"
              value={localFromIso(book.draft.scheduleAt)}
              onChange={(event) => {
                if (!agent) return;
                const scheduleAt = isoFromLocal(event.target.value);
                mutate(
                  (current) => setSchedule(current, scheduleAt, agent.id),
                  scheduleAt ? "Schedule added to draft." : "Schedule cleared.",
                );
              }}
            />
          </label>
          <label>
            Expiry
            <input
              aria-label="Configuration expiry"
              type="datetime-local"
              value={localFromIso(book.draft.expiresAt)}
              onChange={(event) => {
                if (!agent) return;
                const expiresAt = isoFromLocal(event.target.value);
                mutate(
                  (current) => setExpiry(current, expiresAt, agent.id),
                  expiresAt ? "Expiry added to draft." : "Expiry cleared.",
                );
              }}
            />
          </label>
        </div>
      </article>

      <article className="panel">
        <h3>Advanced precedence overrides</h3>
        <p className="state-line">Winning order: global → market → zone → category → app → platform → app version → cohort.</p>
        <div className="field-grid">
          <label>
            Feature
            <select aria-label="Override feature" value={featureKey} onChange={(event) => setFeatureKey(event.target.value as FeatureKey)}>
              <option value="wallet">Wallet</option>
              <option value="reservations">Reservations</option>
            </select>
          </label>
          <label>
            Level
            <select aria-label="Override level" value={level} onChange={(event) => changeLevel(event.target.value as OverrideLevel)}>
              {LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Target
            <select aria-label="Override target" value={target} onChange={(event) => setTarget(event.target.value)}>
              {options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
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
            <input aria-label="Override starts at" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
          </label>
          <label>
            Expires at
            <input aria-label="Override expires at" type="datetime-local" value={ruleExpiresAt} onChange={(event) => setRuleExpiresAt(event.target.value)} />
          </label>
        </div>

        <CommandButton
          command="admin.config.save"
          className="primary-btn"
          type="button"
          targetId="configuration"
          before={`draft ${book.draftRev}`}
          after={`${featureKey} ${level}:${target} ${overrideValue ? "on" : "off"}`}
          onDone={() => {
            if (!agent) return;
            const id = `${featureKey}-${level}-${target}`;
            const next = setOverride(book, {
              id,
              key: featureKey,
              level,
              target,
              value: overrideValue,
              startsAt: isoFromLocal(startsAt),
              expiresAt: isoFromLocal(ruleExpiresAt),
            }, agent.id);
            save(next, `Override ${id} saved to draft.`);
          }}
        >
          Add or replace override
        </CommandButton>

        {book.draft.overrides.length === 0 ? (
          <p className="state-line">No advanced overrides in this draft.</p>
        ) : (
          <ul className="version-list" aria-label="Advanced overrides">
            {book.draft.overrides.map((rule) => (
              <li key={rule.id}>
                <strong>{rule.key}</strong> · {rule.level}:{rule.target} · {rule.value ? "on" : "off"}
                {rule.startsAt ? ` · starts ${rule.startsAt}` : ""}
                {rule.expiresAt ? ` · expires ${rule.expiresAt}` : ""}
                {" "}
                <CommandButton
                  command="admin.config.save"
                  className="link-action"
                  type="button"
                  targetId="configuration"
                  before={rule.id}
                  after="removed"
                  onDone={() => agent && save(removeOverride(book, rule.id, agent.id), `Removed override ${rule.id}.`)}
                >
                  Remove
                </CommandButton>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article className="panel">
        <h3>Effective value viewer</h3>
        <div className="field-grid">
          <label>
            Market
            <input aria-label="Effective market" value={context.market ?? ""} onChange={(event) => setContext((current) => ({ ...current, market: event.target.value }))} />
          </label>
          <label>
            Zone
            <select
              aria-label="Effective zone"
              value={context.zoneId ?? ""}
              onChange={(event) => setContext((current) => ({ ...current, zoneId: event.target.value }))}
            >
              {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
            </select>
          </label>
          <label>
            Category
            <select
              aria-label="Effective category"
              value={context.category ?? "economy"}
              onChange={(event) => setContext((current) => ({ ...current, category: event.target.value }))}
            >
              {CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label>
            App
            <select aria-label="Effective app" value={context.app ?? "rider"} onChange={(event) => setContext((current) => ({ ...current, app: event.target.value as "rider" | "driver" }))}>
              <option value="rider">Rider</option>
              <option value="driver">Driver</option>
            </select>
          </label>
          <label>
            Platform
            <select aria-label="Effective platform" value={context.platform ?? "ios"} onChange={(event) => setContext((current) => ({ ...current, platform: event.target.value as "ios" | "android" }))}>
              <option value="ios">iOS</option>
              <option value="android">Android</option>
            </select>
          </label>
          <label>
            App version
            <input aria-label="Effective app version" value={context.appVersion ?? ""} onChange={(event) => setContext((current) => ({ ...current, appVersion: event.target.value }))} />
          </label>
          <label>
            Cohort
            <input aria-label="Effective cohort" value={context.cohort ?? ""} onChange={(event) => setContext((current) => ({ ...current, cohort: event.target.value }))} />
          </label>
        </div>
        <p className="state-line" data-effective={reservations.level}>
          Effective reservations: {reservations.value}. Winning level: {reservations.level}. {reservations.chain.join(" · ")}
        </p>
        <p className="state-line" data-effective-wallet={wallet.level}>
          Effective wallet: {wallet.value}. Winning level: {wallet.level}. {wallet.chain.join(" · ")}
        </p>
      </article>

      <article className="panel">
        <h3>Legacy per-zone feature switches</h3>
        <label>
          Zone override
          <select
            aria-label="Zone override"
            value={zoneId}
            onChange={(event) => {
              setZoneId(event.target.value);
              if (level === "zone") setTarget(event.target.value);
            }}
          >
            {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
          </select>
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={legacyOverride.reservations ?? book.draft.features.reservations}
            onChange={(event) => agent && mutate(
              (current) => setZoneOverride(current, zoneId, "reservations", event.target.checked, agent.id),
              "Zone override saved in the draft.",
            )}
          />
          Reservations in this zone
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={legacyOverride.wallet ?? book.draft.features.wallet}
            onChange={(event) => agent && mutate(
              (current) => setZoneOverride(current, zoneId, "wallet", event.target.checked, agent.id),
              "Zone override saved in the draft.",
            )}
          />
          Wallet in this zone
        </label>
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
                    onChange={(event) => agent && mutate(
                      (current) => setReason(current, reason.id, "sv", event.target.value, agent.id),
                      "Draft saved. Not published.",
                    )}
                  />
                </label>
                <label>
                  {reason.id} English
                  <input
                    value={reason.en}
                    onChange={(event) => agent && mutate(
                      (current) => setReason(current, reason.id, "en", event.target.value, agent.id),
                      "Draft saved. Not published.",
                    )}
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
            onChange={(event) => agent && mutate(
              (current) => setMaxStops(current, Number(event.target.value), agent.id),
              "Draft saved. Not published.",
            )}
          />
        </label>
      </article>

      <article className="panel">
        <h3>Environment (test only)</h3>
        {([
          ["simulatedArrival", "Simulated arrival (test only)"],
          ["skipActivation", "Skip activation (test only)"],
          ["demoPopup", "Demo popup (test only)"],
          ["demoHint", "Demo hint (test only)"],
        ] as const).map(([key, label]) => (
          <label className="check-row" key={key}>
            <input
              type="checkbox"
              checked={book.draft.environment[key]}
              onChange={(event) => agent && mutate(
                (current) => setEnvironment(current, key, event.target.checked, agent.id),
                "Draft saved. Not published.",
              )}
            />
            {label}
          </label>
        ))}
      </article>

      <article className="panel">
        <h3>Scheduled versions</h3>
        {book.scheduled.length === 0 ? (
          <p className="state-line">No scheduled configuration.</p>
        ) : (
          <ol className="version-list" aria-label="Scheduled configuration">
            {book.scheduled.map((item) => (
              <li key={item.rev}>
                Version {item.rev} · effective {item.effectiveAt} · expires {item.expiresAt ?? "never"} · by {item.actorId}
              </li>
            ))}
          </ol>
        )}
      </article>

      <article className="panel">
        <h3>Publish history</h3>
        <ol aria-label="Publish history">
          {book.publications.length === 0 ? <li>No publishes yet.</li> : book.publications.map((item, index) => (
            <li key={`${item.rev}-${item.kind ?? "publish"}-${index}`}>
              Version {item.rev} · {item.kind ?? "publish"} · by {item.actorId}
              {item.effectiveAt ? ` · effective ${item.effectiveAt}` : ""}
              {item.expiresAt ? ` · expires ${item.expiresAt}` : ""}
              {item.diff.length ? `: ${item.diff.join("; ")}` : ": no diff"}
            </li>
          ))}
        </ol>
      </article>

      <article className="panel">
        <h3>Review and publish</h3>
        <div className="actions">
          <CommandButton
            command="admin.config.review"
            confirmTarget={false}
            className="secondary-btn"
            type="button"
            targetId="configuration"
            before={book.status}
            after="in_review"
            onDone={() => {
              if (!agent) return;
              const result = submitConfigApproval(book, agent.id);
              if (result.error) setNotice(result.error);
              else save(result.book, "Sent for approval.");
            }}
          >
            Send for approval
          </CommandButton>

          <CommandButton
            command="admin.config.approve"
            confirmTarget={false}
            className="secondary-btn"
            type="button"
            targetId="configuration"
            before={book.status}
            after="approved"
            onDone={() => {
              if (!agent) return;
              const result = approveConfig(book, agent.id);
              if (result.error) setNotice(result.error);
              else save(result.book, "Approved. A second agent can publish.");
            }}
          >
            Approve
          </CommandButton>

          <CommandButton
            command="admin.config.publish"
            confirmTarget={false}
            className="primary-btn"
            type="button"
            targetId="configuration"
            before={book.status}
            after={book.draft.scheduleAt ? "scheduled" : "published"}
            onDone={() => {
              if (!agent) return;
              const result = publishConfig(book, agent.id, new Date().toISOString());
              if (result.error) {
                setNotice(result.error);
                return;
              }
              save(
                result.book,
                result.scheduled
                  ? `Scheduled configuration version ${result.book.rev}.`
                  : `Published version ${result.book.rev}.`,
              );
            }}
          >
            Publish
          </CommandButton>

          <CommandButton
            command="admin.config.rollback"
            confirmTarget={false}
            className="secondary-btn"
            type="button"
            targetId="configuration"
            before={`version ${book.rev}`}
            after="previous snapshot as new version"
            disabled={book.history.length < 2}
            onDone={() => {
              if (!agent) return;
              const next = rollbackConfig(book, agent.id, new Date().toISOString());
              save(next, next.rev === book.rev ? "No previous version to restore." : `Rolled back as new version ${next.rev}.`);
            }}
          >
            Roll back
          </CommandButton>

          <CommandButton
            command="admin.config.save"
            className="secondary-btn"
            type="button"
            targetId="configuration"
            before="clock"
            after="apply due schedules and expiry"
            onDone={() => {
              const next = advanceConfigClock(book, new Date().toISOString());
              save(next, next === book ? "No schedule or expiry is due." : "Due schedule/expiry applied.");
            }}
          >
            Apply due schedule / expiry
          </CommandButton>
        </div>
      </article>
    </>
  );
}
