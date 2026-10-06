import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useSession } from "../auth/SessionContext";
import { zoneStore, useZoneUi } from "../zones/bookStore";
import { RIDE_CATEGORIES, zoneAreaKm, zoneStatus, zoneTypeLabel, type ZoneShape } from "../zones/releases";
import { PageHeading } from "../ui/PageHeading";
import { CommandButton } from "../ui/CommandButton";
import { TabPanel, Tabs } from "../ui/Tabs";

const TABS = ["Shape", "Settings", "Pricing", "Dispatch", "Pickup points", "Airport", "Schedule", "History"];

function TextField({ label, value, onCommit, type = "text" }: { label: string; value: string; onCommit: (value: string) => void; type?: string }) {
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);
  return (
    <label>
      {label}
      <input type={type} value={text} onChange={(event) => setText(event.target.value)} onBlur={() => { if (text !== value) onCommit(text); }} />
    </label>
  );
}

export function ZoneDetailPage() {
  const { zoneId = "" } = useParams();
  const { agent } = useSession();
  const ui = useZoneUi();
  const [tab, setTab] = useState("shape");
  const [pickupName, setPickupName] = useState("");
  const [pickupLat, setPickupLat] = useState("59.649");
  const [pickupLng, setPickupLng] = useState("17.930");
  const [pickupNotes, setPickupNotes] = useState("");
  const zone = ui.book.draft.find((item) => item.id === zoneId);

  function save(patch: Partial<ZoneShape>) {
    if (!agent || !zone) return;
    zoneStore.patch(zone.id, patch, agent.id);
  }

  if (!zone) {
    return (
      <PageHeading title="Zone not found" subtitle="That zone is not in the draft.">
        <Link to="/zones">Back to zones</Link>
      </PageHeading>
    );
  }

  const status = zoneStatus(zone, ui.book);

  return (
    <>
      <PageHeading title={zone.name} subtitle={`${zone.code} · ${zoneTypeLabel(zone.kind)}`}>
        <Link to="/zones">Back to zones</Link>
      </PageHeading>
      <p className="state-line" data-zone-status={status}>Status: {status}</p>
      <Tabs tabs={TABS} activeId={tab} onChange={setTab} />
      <article className="panel">
        <TabPanel id="shape" activeId={tab}>
          <p className="state-line">Points: {zone.points.length}. Holes: {zone.holes.length}. Area: {zoneAreaKm(zone).toFixed(2)} km².</p>
          <p className="state-line">Parent: {zone.parentId ?? "none"}. Draw the outline, cut a hole, or edit points on the zones map.</p>
          <Link to="/zones">Edit shape on the map</Link>
        </TabPanel>
        <TabPanel id="settings" activeId={tab}>
          <div className="field-grid">
            <TextField label="Name" value={zone.name} onCommit={(name) => save({ name })} />
            <TextField label="Notes" value={zone.notes} onCommit={(notes) => save({ notes })} />
            <TextField label="Minimum app version" value={zone.minAppVersion} onCommit={(minAppVersion) => save({ minAppVersion })} />
            <TextField label="Suspended until" value={zone.suspendedUntil} onCommit={(suspendedUntil) => save({ suspendedUntil })} />
            <TextField label="Suspend reason" value={zone.suspendReason} onCommit={(suspendReason) => save({ suspendReason })} />
          </div>
          <label className="check-row"><input type="checkbox" checked={zone.active} onChange={(event) => save({ active: event.target.checked })} /> Active</label>
          <label className="check-row"><input type="checkbox" checked={zone.cash} onChange={(event) => save({ cash: event.target.checked })} /> Cash allowed</label>
          <label className="check-row"><input type="checkbox" checked={zone.pinRequired} onChange={(event) => save({ pinRequired: event.target.checked })} /> PIN required</label>
          <div className="actions">
            {RIDE_CATEGORIES.map((category) => (
              <label key={category} className="check-row">
                <input
                  type="checkbox"
                  checked={zone.categories.includes(category)}
                  onChange={(event) => {
                    const categories = event.target.checked ? [...zone.categories, category] : zone.categories.filter((item) => item !== category);
                    save({ categories });
                  }}
                />
                {category}
              </label>
            ))}
          </div>
        </TabPanel>
        <TabPanel id="pricing" activeId={tab}>
          <div className="field-grid">
            <TextField label="Price set" value={zone.priceSet} onCommit={(priceSet) => save({ priceSet })} />
            <TextField label="Zone fee öre" value={String(zone.zoneFeeOre)} onCommit={(value) => save({ zoneFeeOre: Number(value) || 0 })} />
            <TextField label="Airport fee öre" value={String(zone.airportFeeOre)} onCommit={(value) => save({ airportFeeOre: Number(value) || 0 })} />
            <TextField label="Boost rule" value={zone.boostRule} onCommit={(boostRule) => save({ boostRule })} />
          </div>
        </TabPanel>
        <TabPanel id="dispatch" activeId={tab}>
          <div className="field-grid">
            <TextField label="Search radius km" value={String(zone.searchRadiusKm)} onCommit={(value) => save({ searchRadiusKm: Number(value) || 0 })} />
            <TextField label="Offer seconds" value={String(zone.offerSeconds)} onCommit={(value) => save({ offerSeconds: Number(value) || 0 })} />
            <TextField label="Next trip km" value={String(zone.nextTripKm)} onCommit={(value) => save({ nextTripKm: Number(value) || 0 })} />
            <TextField label="Max wait minutes" value={String(zone.maxWaitMin)} onCommit={(value) => save({ maxWaitMin: Number(value) || 0 })} />
          </div>
          <label className="check-row"><input type="checkbox" checked={zone.destinationMode} onChange={(event) => save({ destinationMode: event.target.checked })} /> Destination mode</label>
        </TabPanel>
        <TabPanel id="pickup-points" activeId={tab}>
          <ul>
            {zone.pickups.length === 0 ? <li>No pickup points yet.</li> : zone.pickups.map((pickup) => (
              <li key={pickup.id}>{pickup.name} · {pickup.lat.toFixed(5)}, {pickup.lng.toFixed(5)} · {pickup.instructions}</li>
            ))}
          </ul>
          <div className="field-grid">
            <label>
              Pickup name
              <input value={pickupName} onChange={(event) => setPickupName(event.target.value)} />
            </label>
            <label>
              Pickup latitude
              <input value={pickupLat} onChange={(event) => setPickupLat(event.target.value)} />
            </label>
            <label>
              Pickup longitude
              <input value={pickupLng} onChange={(event) => setPickupLng(event.target.value)} />
            </label>
            <label>
              Pickup instructions
              <input value={pickupNotes} onChange={(event) => setPickupNotes(event.target.value)} />
            </label>
          </div>
          <CommandButton
            command="admin.zone.addPickup"
            className="secondary-btn"
            type="button"
            onDone={() => {
              if (!agent) return;
              zoneStore.addPickup(zone.id, {
                id: `pin-${zone.pickups.length + 1}-${pickupName.slice(0, 12) || "stop"}`,
                name: pickupName.trim() || "Pickup",
                lat: Number(pickupLat) || 0,
                lng: Number(pickupLng) || 0,
                instructions: pickupNotes,
                photoUrl: "",
              }, agent.id);
              setPickupName("");
            }}
          >
            Add pickup
          </CommandButton>
        </TabPanel>
        <TabPanel id="airport" activeId={tab}>
          <label className="check-row"><input type="checkbox" checked={zone.queueOn} onChange={(event) => save({ queueOn: event.target.checked })} /> Queue on</label>
          <div className="field-grid">
            <TextField label="Max queue minutes" value={String(zone.maxQueueMin)} onCommit={(value) => save({ maxQueueMin: Number(value) || 0 })} />
            <TextField label="Queue fee öre" value={String(zone.queueFeeOre)} onCommit={(value) => save({ queueFeeOre: Number(value) || 0 })} />
            <TextField label="Terminals" value={zone.terminals} onCommit={(terminals) => save({ terminals })} />
          </div>
        </TabPanel>
        <TabPanel id="schedule" activeId={tab}>
          <label>
            Schedule
            <select value={zone.schedule} onChange={(event) => save({ schedule: event.target.value as ZoneShape["schedule"] })}>
              <option value="always">Always</option>
              <option value="weekly">Weekly hours</option>
              <option value="range">Date range</option>
            </select>
          </label>
          <div className="field-grid">
            <TextField label="Hours" value={zone.hours} onCommit={(hours) => save({ hours })} />
            <TextField label="From" value={zone.from} onCommit={(from) => save({ from })} />
            <TextField label="Until" value={zone.until} onCommit={(until) => save({ until })} />
          </div>
        </TabPanel>
        <TabPanel id="history" activeId={tab}>
          <ol className="version-list" aria-label="Zone history">
            {ui.book.versions.map((version, index) => {
              const snap = version.find((item) => item.id === zone.id);
              return (
                <li key={index}>
                  Version {index + 1}{snap ? ` · ${snap.points.length} points` : " · not in this version"}
                  {snap ? (
                    <CommandButton command="admin.zone.restoreVersion" className="link-action" type="button" onDone={() => { if (agent) zoneStore.restore(zone.id, index, agent.id); }}>
                      Restore version {index + 1}
                    </CommandButton>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </TabPanel>
      </article>
    </>
  );
}
