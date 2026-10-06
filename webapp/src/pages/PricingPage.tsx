import { useState } from "react";
import { useSlice } from "../api/hooks";
import { CATEGORY_INFO, RIDE_OPTION_INFO, defaultPriceBook, type PriceBook } from "../pricing/sets";
import { PageHeading } from "../ui/PageHeading";
import { TabPanel, Tabs } from "../ui/Tabs";
import { PriceEditor } from "./PriceEditor";
import { QuotePreview } from "./QuotePreview";

const PRICING_TABS = [
  { id: "categories", label: "Vehicle Categories" },
  { id: "booking", label: "Booking Controls" },
  { id: "rules", label: "Fare Calculation Rules" },
  { id: "boost", label: "Boost Pricing" },
  { id: "commission", label: "Commission" },
] as const;

type PricingTabId = (typeof PRICING_TABS)[number]["id"];

export function PricingPage() {
  const [tab, setTab] = useState<PricingTabId>("categories");
  const slice = useSlice<PriceBook>("prices", defaultPriceBook());
  const [draft, setDraft] = useState<PriceBook | null>(null);
  const book = draft ?? (slice.value?.zones?.length ? slice.value : defaultPriceBook());
  const reference = book.zones[0];

  return (
    <>
      <PageHeading
        title="Pricing & categories"
        subtitle="One price book powers editing and quote preview. Legacy controls that could report success without saving were removed."
      />

      <PriceEditor book={book} onChange={setDraft} />
      <QuotePreview book={book} />

      <Tabs
        tabs={PRICING_TABS}
        activeId={tab}
        onChange={(id) => setTab(id as PricingTabId)}
      />

      <TabPanel id="categories" activeId={tab}>
        <article className="panel">
          <h3>Seven categories</h3>
          <p className="state-line">Category ids are shared with the apps. Movera is the display name for economy.</p>
          <ul className="version-list">
            {CATEGORY_INFO.map((item) => (
              <li key={item.id}>
                <strong>{item.label}</strong> · {item.id} · {item.line} · {item.badge} · {item.eligibility}
              </li>
            ))}
          </ul>
          <h3>Ride options</h3>
          <ul className="version-list">
            {RIDE_OPTION_INFO.map((item) => (
              <li key={item.id}>{item.label} · {item.id} · {item.note}</li>
            ))}
          </ul>
        </article>
      </TabPanel>

      <TabPanel id="booking" activeId={tab}>
        <article className="panel">
          <h3>Booking controls</h3>
          <p className="state-line">
            The editable per-zone money values are in the price-set editor above. Remaining dispatch and reservation controls are completed in their dedicated workspaces instead of duplicated here.
          </p>
          {reference ? (
            <div className="field-grid">
              <label>Adjustment minimum<input readOnly value={`${reference.adjustMin}%`} /></label>
              <label>Adjustment maximum<input readOnly value={`${reference.adjustMax}%`} /></label>
              <label>Adjustment step<input readOnly value={`${reference.adjustStep}%`} /></label>
              <label>Quote validity<input readOnly value={`${reference.quoteSeconds} s`} /></label>
              <label>Tips<input readOnly value={reference.tips.join(" / ") + " kr"} /></label>
              <label>Waiting<input readOnly value={`${reference.waitingPerMin} kr/min`} /></label>
            </div>
          ) : <p className="state-line">No price set is available.</p>}
        </article>
      </TabPanel>

      <TabPanel id="rules" activeId={tab}>
        <article className="panel">
          <h3>Fare calculation order</h3>
          <ol className="rules-list">
            <li>Pickup + distance + time.</li>
            <li>Rider adjustment inside the configured minimum and maximum.</li>
            <li>Boost multiplier.</li>
            <li>System minimum and maximum.</li>
            <li>Waiting, cancellation, reservation, airport and event fees.</li>
          </ol>
          <p className="state-line">The quote preview above reads the same current price book and shows its rule version.</p>
        </article>
      </TabPanel>

      <TabPanel id="boost" activeId={tab}>
        <article className="panel">
          <h3>Boost values</h3>
          {reference ? (
            <div className="field-grid">
              <label>Manual<input readOnly value={reference.boostManual} /></label>
              <label>Scheduled<input readOnly value={reference.boostScheduled} /></label>
              <label>Automatic<input readOnly value={reference.boostAuto} /></label>
              <label>Cap<input readOnly value={reference.boostCap} /></label>
            </div>
          ) : <p className="state-line">No price set is available.</p>}
          <p className="state-line">Editing and scheduling boost is intentionally not duplicated in this legacy section. R9 will expose the complete persisted workflow.</p>
        </article>
      </TabPanel>

      <TabPanel id="commission" activeId={tab}>
        <article className="panel">
          <h3>Commission</h3>
          {reference ? (
            <>
              <ul className="version-list">
                {CATEGORY_INFO.map((item) => (
                  <li key={item.id}>{item.label} · {reference.commission[item.id]}%</li>
                ))}
              </ul>
              <p>Fleet commission · {reference.fleetCommission}%</p>
            </>
          ) : <p className="state-line">No price set is available.</p>}
          <p className="state-line">This panel is read-only until the persisted R9 commission workflow lands. No button can claim a save without changing the price book.</p>
        </article>
      </TabPanel>
    </>
  );
}
