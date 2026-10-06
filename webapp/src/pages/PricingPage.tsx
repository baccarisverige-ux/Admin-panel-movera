import { useMemo, useState } from "react";
import {
  defaultPricingBook,
  normalizePricingBook,
  removeBoostSchedule,
  restorePricingVersion,
  saveBoostSchedule,
  savePriceZone,
  useCommands,
  useSlice,
  validateZonePrice,
  type BoostSchedule,
  type PricingBook,
} from "../api/hooks";
import { can } from "../auth/permissions";
import { useSession } from "../auth/SessionContext";
import {
  CATEGORY_INFO,
  RIDE_OPTION_INFO,
  defaultPriceBook,
  type PriceBook,
  type ZonePrice,
} from "../pricing/sets";
import { PageHeading } from "../ui/PageHeading";
import { CommandButton } from "../ui/CommandButton";
import { TabPanel, Tabs } from "../ui/Tabs";
import { PriceEditor } from "./PriceEditor";
import { QuotePreview } from "./QuotePreview";

const PRICING_TABS = [
  { id: "categories", label: "Vehicle Categories" },
  { id: "booking", label: "Booking Controls" },
  { id: "rules", label: "Fare Calculation Rules" },
  { id: "boost", label: "Boost Pricing" },
  { id: "commission", label: "Commission" },
  { id: "history", label: "History" },
] as const;

type PricingTabId = (typeof PRICING_TABS)[number]["id"];

function isoValue(value: string): string {
  return value ? new Date(value).toISOString() : "";
}

export function PricingPage() {
  const { agent } = useSession();
  const commands = useCommands();
  const slice = useSlice<PricingBook | PriceBook>("prices", defaultPricingBook());
  const persisted = useMemo(() => normalizePricingBook(slice.value), [slice.value]);
  const [tab, setTab] = useState<PricingTabId>("categories");
  const [zoneId, setZoneId] = useState("Z001");
  const [draft, setDraft] = useState<PriceBook | null>(null);
  const [scheduleMultiplier, setScheduleMultiplier] = useState("1.8");
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [notice, setNotice] = useState("Pricing is simulation-backed frontend data. No backend or app configuration is changed.");

  const book = draft ?? persisted.book ?? defaultPriceBook();
  const zone = book.zones.find((item) => item.zoneId === zoneId) ?? book.zones[0];
  const persistedZone = persisted.book.zones.find((item) => item.zoneId === zone?.zoneId);
  const canPublish = Boolean(agent && can(agent.role, "settings.publish"));
  const validationError = zone ? validateZonePrice(zone) : "No price zone is available.";
  const dirty = Boolean(zone && persistedZone && JSON.stringify(zone) !== JSON.stringify(persistedZone));

  function patchZone(patch: Partial<ZonePrice>) {
    if (!zone || !canPublish) return;
    setDraft({
      ...book,
      zones: book.zones.map((item) => item.zoneId === zone.zoneId ? { ...item, ...patch } : item),
    });
  }

  async function saveZone(reason: string) {
    if (!agent || !zone) return;
    const prepared = savePriceZone(persisted, book, zone.zoneId, agent.id, reason, new Date().toISOString());
    if (prepared.error) {
      setNotice(prepared.error);
      return;
    }
    const result = await commands.run("admin.pricing.saveZone", {
      reason,
      targetId: zone.zoneId,
      scope: zone.zoneId,
      before: `${zone.zoneName} v${persistedZone?.version ?? 0} · pricing rev ${persisted.draftRev}`,
      after: `${zone.zoneName} v${prepared.book.book.zones.find((item) => item.zoneId === zone.zoneId)?.version ?? 0} · pricing rev ${prepared.book.draftRev}`,
      expectedSliceRev: persisted.draftRev,
      sliceKey: "prices",
      value: prepared.book,
    });
    if (result) {
      setDraft(null);
      setNotice(`${zone.zoneName} price set saved as pricing revision ${prepared.book.draftRev}.`);
    }
  }

  if (slice.loading) return <p className="state-line">Loading pricing.</p>;
  if (!zone) return <p className="state-line">No price zone is available.</p>;

  const activeSchedules = persisted.schedules.filter((item) => item.zoneId === zone.zoneId);
  const schedule: BoostSchedule = {
    id: `${zone.zoneId}-${scheduleStart || "new"}-${scheduleMultiplier}`,
    zoneId: zone.zoneId,
    multiplier: Number(scheduleMultiplier),
    startsAt: isoValue(scheduleStart),
    endsAt: isoValue(scheduleEnd),
    enabled: scheduleEnabled,
  };
  const schedulePrepared = agent
    ? saveBoostSchedule(persisted, schedule, agent.id, "Scheduled boost update", new Date().toISOString())
    : { book: persisted, error: "Sign in again." };

  return (
    <>
      <PageHeading
        title="Pricing & categories"
        subtitle={`One persisted price book controls rates, availability, options, fees, adjustment range, boosts, commission and quote preview. Pricing revision ${persisted.draftRev}.`}
      />

      <p className="state-line" data-pricing-dirty={dirty ? "yes" : "no"}>
        {notice} {commands.message} {canPublish ? "" : "Your role is read-only for pricing."}
        {dirty ? " Unsaved changes." : " Saved price set."}
      </p>

      <PriceEditor
        book={book}
        zoneId={zone.zoneId}
        onZoneChange={(id) => {
          setZoneId(id);
          setDraft(null);
        }}
        onChange={setDraft}
        onSave={() => void saveZone("Price set update")}
        canEdit={canPublish}
        saving={commands.busy || commands.phase === "submitting"}
        validationError={validationError}
      />

      <QuotePreview pricing={{ ...persisted, book }} />

      <Tabs tabs={PRICING_TABS} activeId={tab} onChange={(id) => setTab(id as PricingTabId)} />

      <TabPanel id="categories" activeId={tab}>
        <article className="panel">
          <h3>Seven fixed app categories</h3>
          <p className="state-line">IDs are contractual and cannot be renamed in this frontend phase. Availability is controlled per zone in the price-set editor above.</p>
          <ul className="version-list">
            {CATEGORY_INFO.map((item) => (
              <li key={item.id}>
                <strong>{item.label}</strong> · {item.id} · {zone.enabledCategories[item.id] ? "enabled" : "disabled"} · {item.line} · {item.eligibility}
              </li>
            ))}
          </ul>
          <h3>Ride options</h3>
          <ul className="version-list">
            {RIDE_OPTION_INFO.map((item) => (
              <li key={item.id}>
                {item.label} · {zone.enabledOptions[item.id] ? "enabled" : "disabled"} · fee {zone.optionFee[item.id]} kr · {item.note}
              </li>
            ))}
          </ul>
        </article>
      </TabPanel>

      <TabPanel id="booking" activeId={tab}>
        <article className="panel">
          <h3>Booking, fees and adjustment controls · {zone.zoneName}</h3>
          <div className="field-grid">
            <label>
              Adjustment minimum (%)
              <input disabled={!canPublish} aria-label="Adjustment minimum" type="number" value={zone.adjustMin} onChange={(event) => patchZone({ adjustMin: Number(event.target.value) })} />
            </label>
            <label>
              Adjustment maximum (%)
              <input disabled={!canPublish} aria-label="Adjustment maximum" type="number" value={zone.adjustMax} onChange={(event) => patchZone({ adjustMax: Number(event.target.value) })} />
            </label>
            <label>
              Adjustment step (%)
              <input disabled={!canPublish} aria-label="Adjustment step" type="number" value={zone.adjustStep} onChange={(event) => patchZone({ adjustStep: Number(event.target.value) })} />
            </label>
            <label>
              Quote validity (s)
              <input disabled={!canPublish} aria-label="Quote validity" type="number" value={zone.quoteSeconds} onChange={(event) => patchZone({ quoteSeconds: Number(event.target.value) })} />
            </label>
            <label>
              Waiting (kr/min)
              <input disabled={!canPublish} aria-label="Waiting per minute" type="number" value={zone.waitingPerMin} onChange={(event) => patchZone({ waitingPerMin: Number(event.target.value) })} />
            </label>
            <label>
              Cancellation fee
              <input disabled={!canPublish} aria-label="Cancellation fee" type="number" value={zone.cancelFee} onChange={(event) => patchZone({ cancelFee: Number(event.target.value) })} />
            </label>
            <label>
              Reservation fee
              <input disabled={!canPublish} aria-label="Reservation fee" type="number" value={zone.reservationFee} onChange={(event) => patchZone({ reservationFee: Number(event.target.value) })} />
            </label>
            <label>
              Booking fee
              <input disabled={!canPublish} aria-label="Booking fee" type="number" value={zone.bookingFee} onChange={(event) => patchZone({ bookingFee: Number(event.target.value) })} />
            </label>
            <label>
              Airport fee
              <input disabled={!canPublish} aria-label="Airport fee" type="number" value={zone.airportFee} onChange={(event) => patchZone({ airportFee: Number(event.target.value) })} />
            </label>
            <label>
              Event fee
              <input disabled={!canPublish} aria-label="Event fee" type="number" value={zone.eventFee} onChange={(event) => patchZone({ eventFee: Number(event.target.value) })} />
            </label>
            <label>
              Tip presets (kr, comma separated)
              <input
                disabled={!canPublish}
                aria-label="Tip presets"
                value={zone.tips.join(", ")}
                onChange={(event) => patchZone({
                  tips: event.target.value.split(",").map((part) => Number(part.trim())).filter((value) => Number.isFinite(value)),
                })}
              />
            </label>
          </div>
          {validationError ? <p className="state-line">{validationError}</p> : null}
          <button
            data-command="admin.pricing.saveBooking"
            className="primary-btn"
            type="button"
            disabled={!canPublish || !dirty || Boolean(validationError) || commands.busy}
            onClick={() => void saveZone("Booking and fee controls update")}
          >
            Save booking controls
          </button>
        </article>
      </TabPanel>

      <TabPanel id="rules" activeId={tab}>
        <article className="panel">
          <h3>Fare calculation order</h3>
          <ol className="rules-list">
            <li>Pickup + distance + time.</li>
            <li>Rider adjustment clamped to the zone minimum and maximum percentage.</li>
            <li>Selected boost multiplier, capped by the zone boost cap.</li>
            <li>System category minimum and maximum fare.</li>
            <li>Waiting, booking, reservation, airport, event and enabled ride-option fees.</li>
            <li>Tip presets remain suggestions and are not included in the ride quote.</li>
          </ol>
          <p className="state-line">Quote preview reads the same unsaved draft so operators can validate impact before saving.</p>
        </article>
      </TabPanel>

      <TabPanel id="boost" activeId={tab}>
        <article className="panel">
          <h3>Boost pricing · {zone.zoneName}</h3>
          <div className="field-grid">
            <label>
              Manual boost
              <input disabled={!canPublish} aria-label="Manual boost" type="number" step="0.1" value={zone.boostManual} onChange={(event) => patchZone({ boostManual: Number(event.target.value) })} />
            </label>
            <label>
              Scheduled default
              <input disabled={!canPublish} aria-label="Scheduled boost" type="number" step="0.1" value={zone.boostScheduled} onChange={(event) => patchZone({ boostScheduled: Number(event.target.value) })} />
            </label>
            <label>
              Automatic boost
              <input disabled={!canPublish} aria-label="Automatic boost" type="number" step="0.1" value={zone.boostAuto} onChange={(event) => patchZone({ boostAuto: Number(event.target.value) })} />
            </label>
            <label>
              Boost cap
              <input disabled={!canPublish} aria-label="Boost cap" type="number" step="0.1" value={zone.boostCap} onChange={(event) => patchZone({ boostCap: Number(event.target.value) })} />
            </label>
          </div>
          <button
            data-command="admin.pricing.saveBoost"
            className="primary-btn"
            type="button"
            disabled={!canPublish || !dirty || Boolean(validationError) || commands.busy}
            onClick={() => void saveZone("Boost controls update")}
          >
            Save boost controls
          </button>

          <h4>Scheduled boost window</h4>
          <div className="field-grid">
            <label>
              Multiplier
              <input aria-label="Schedule multiplier" disabled={!canPublish} type="number" min="1" max={zone.boostCap} step="0.1" value={scheduleMultiplier} onChange={(event) => setScheduleMultiplier(event.target.value)} />
            </label>
            <label>
              Starts
              <input aria-label="Schedule start" disabled={!canPublish} type="datetime-local" value={scheduleStart} onChange={(event) => setScheduleStart(event.target.value)} />
            </label>
            <label>
              Ends
              <input aria-label="Schedule end" disabled={!canPublish} type="datetime-local" value={scheduleEnd} onChange={(event) => setScheduleEnd(event.target.value)} />
            </label>
            <label className="check-row">
              <input aria-label="Schedule enabled" disabled={!canPublish} type="checkbox" checked={scheduleEnabled} onChange={(event) => setScheduleEnabled(event.target.checked)} />
              Enabled
            </label>
          </div>
          <CommandButton
            command="admin.pricing.schedule"
            className="secondary-btn"
            type="button"
            targetId={schedule.id}
            confirmTarget={false}
            scope={zone.zoneId}
            before={`pricing rev ${persisted.draftRev}`}
            after={`${zone.zoneName} boost ${schedule.multiplier}× ${schedule.startsAt} → ${schedule.endsAt}`}
            expectedSliceRev={persisted.draftRev}
            sliceKey="prices"
            value={schedulePrepared.book}
            disabled={!canPublish || Boolean(schedulePrepared.error)}
            title={schedulePrepared.error}
            onDone={() => {
              setNotice("Boost schedule saved.");
              setScheduleStart("");
              setScheduleEnd("");
            }}
          >
            Save boost schedule
          </CommandButton>

          {activeSchedules.length === 0 ? (
            <p className="state-line">No scheduled boosts for this zone.</p>
          ) : (
            <ul aria-label="Boost schedules" className="version-list">
              {activeSchedules.map((item) => {
                const removal = agent
                  ? removeBoostSchedule(persisted, item.id, agent.id, "Remove scheduled boost", new Date().toISOString())
                  : { book: persisted, error: "Sign in again." };
                return (
                  <li key={item.id}>
                    {item.multiplier}× · {item.startsAt} → {item.endsAt} · {item.enabled ? "enabled" : "disabled"}
                    <CommandButton
                      command="admin.pricing.removeSchedule"
                      className="link-action"
                      type="button"
                      targetId={item.id}
                      confirmTarget={false}
                      scope={item.zoneId}
                      before="scheduled"
                      after="removed"
                      expectedSliceRev={persisted.draftRev}
                      sliceKey="prices"
                      value={removal.book}
                      disabled={!canPublish || Boolean(removal.error)}
                      title={removal.error}
                      onDone={() => setNotice("Boost schedule removed.")}
                    >
                      remove
                    </CommandButton>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </TabPanel>

      <TabPanel id="commission" activeId={tab}>
        <article className="panel">
          <h3>Commission · {zone.zoneName}</h3>
          <div className="field-grid">
            {CATEGORY_INFO.map((item) => (
              <label key={item.id}>
                {item.label} commission (%)
                <input
                  aria-label={`${item.label} commission`}
                  disabled={!canPublish}
                  type="number"
                  min="0"
                  max="100"
                  value={zone.commission[item.id]}
                  onChange={(event) => patchZone({ commission: { ...zone.commission, [item.id]: Number(event.target.value) } })}
                />
              </label>
            ))}
            <label>
              Fleet commission (%)
              <input disabled={!canPublish} aria-label="Fleet commission" type="number" min="0" max="100" value={zone.fleetCommission} onChange={(event) => patchZone({ fleetCommission: Number(event.target.value) })} />
            </label>
          </div>
          <button
            data-command="admin.pricing.saveRules"
            className="primary-btn"
            type="button"
            disabled={!canPublish || !dirty || Boolean(validationError) || commands.busy}
            onClick={() => void saveZone("Commission update")}
          >
            Save commission
          </button>
        </article>
      </TabPanel>

      <TabPanel id="history" activeId={tab}>
        <article className="panel">
          <h3>Pricing history</h3>
          {persisted.history.length === 0 ? (
            <p className="state-line">No saved pricing revision yet.</p>
          ) : (
            <ol className="version-list" aria-label="Pricing history">
              {persisted.history.map((version) => {
                const restore = agent ? restorePricingVersion(persisted, version.rev, agent.id, new Date().toISOString()) : { book: persisted, error: "Sign in again." };
                return (
                  <li key={version.rev}>
                    Revision {version.rev} · {version.at} · {version.actorId} · {version.reason}
                    <CommandButton
                      command="admin.pricing.restore"
                      className="link-action"
                      type="button"
                      targetId={`pricing-rev-${version.rev}`}
                      confirmTarget={false}
                      scope="all"
                      before={`pricing rev ${persisted.draftRev}`}
                      after={`restore pricing rev ${version.rev} as ${restore.book.draftRev}`}
                      expectedSliceRev={persisted.draftRev}
                      sliceKey="prices"
                      value={restore.book}
                      disabled={!canPublish || Boolean(restore.error)}
                      title={restore.error}
                      onDone={() => {
                        setDraft(null);
                        setNotice(`Pricing revision ${version.rev} restored as revision ${restore.book.draftRev}.`);
                      }}
                    >
                      restore
                    </CommandButton>
                  </li>
                );
              })}
            </ol>
          )}
        </article>
      </TabPanel>
    </>
  );
}
