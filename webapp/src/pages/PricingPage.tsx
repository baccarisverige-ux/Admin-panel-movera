import { useState } from "react";
import { useSlice } from "../api/hooks";
import { PRICE_ROWS, catalogFor } from "../api/read";
import { defaultPriceBook, type PriceBook } from "../pricing/sets";
import { Modal } from "../ui/Modal";
import { DataTable } from "../ui/DataTable";
import { PageHeading } from "../ui/PageHeading";
import { TabPanel, Tabs } from "../ui/Tabs";
import { ZoneSelect } from "../ui/ZoneSelect";
import { PriceEditor } from "./PriceEditor";
import { QuotePreview } from "./QuotePreview";
import { CommandButton } from "../ui/CommandButton";

const PRICING_TABS = [
  { id: "categories", label: "Vehicle Categories" },
  { id: "booking", label: "Booking Controls" },
  { id: "rules", label: "Fare Calculation Rules" },
  { id: "boost", label: "Boost Pricing" },
  { id: "commission", label: "Commission" },
] as const;

type PricingTabId = (typeof PRICING_TABS)[number]["id"];

const RATE_COLUMNS = [
  "Pickup Fare",
  "Per KM Rate",
  "Per Min Rate",
  "Min Fare",
  "Max Fare",
  "Min Increase by Rider",
  "Max Increase by Rider",
] as const;

type RateRow = {
  category: string;
  values: string[];
};

export function PricingPage() {
  const page = catalogFor("pricing");
  const [tab, setTab] = useState<PricingTabId>("categories");
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [rows, setRows] = useState<RateRow[]>(() =>
    PRICE_ROWS.map(([category, ...values]) => ({ category, values: [...values] })),
  );
  const slice = useSlice<PriceBook>("prices", defaultPriceBook());
  const [draft, setDraft] = useState<PriceBook | null>(null);
  const book = draft ?? (slice.value?.zones?.length ? slice.value : defaultPriceBook());

  function closeModal() {
    setCategoryModalOpen(false);
  }

  function updateRate(rowIndex: number, valueIndex: number, next: string) {
    setRows((current) =>
      current.map((row, index) =>
        index === rowIndex
          ? {
              category: row.category,
              values: row.values.map((value, inner) => (inner === valueIndex ? next : value)),
            }
          : row,
      ),
    );
  }

  return (
    <>
      <PageHeading title={page.title} subtitle={page.subtitle}>
        <div className="actions">
          <ZoneSelect
            includeAll={false}
            placeholderOption="Select Zone"
            defaultValue="Select Zone"
          />
          <CommandButton command="admin.pricing.saveAll" className="primary-btn" type="button">
            Save All Changes
          </CommandButton>
          <CommandButton command="admin.pricing.addCategory" className="secondary-btn" type="button" onDone={() => setCategoryModalOpen(true)}>
            Add Category
          </CommandButton>
        </div>
      </PageHeading>

      <PriceEditor book={book} onChange={setDraft} />
      <QuotePreview book={book} />

      <Tabs
        tabs={PRICING_TABS}
        activeId={tab}
        onChange={(id) => setTab(id as PricingTabId)}
      />

      <TabPanel id="categories" activeId={tab}>
        <article className="panel">
          <div className="panel-title-row">
            <h3>Vehicle Categories</h3>
            <CommandButton command="admin.pricing.export" className="secondary-btn" type="button">
              Export
            </CommandButton>
          </div>
          <div className="table-wrap">
            <DataTable
              className="pricing-table"
              head={["Category", ...RATE_COLUMNS, "Actions"]}
              rows={rows.map((row, rowIndex) => [
                row.category,
                ...row.values.map((value, valueIndex) => (
                  <input key={RATE_COLUMNS[valueIndex]} value={value} onChange={(event) => updateRate(rowIndex, valueIndex, event.target.value)} />
                )),
                <span key={row.category}>
                  <CommandButton command="admin.pricing.saveRow" className="link-action" type="button">Save</CommandButton>
                  <CommandButton command="admin.pricing.deleteRow" className="link-action danger-text" type="button">Delete</CommandButton>
                </span>,
              ])}
            />
          </div>
        </article>
      </TabPanel>

      <TabPanel id="booking" activeId={tab}>
        <article className="panel">
          <div className="panel-title-row">
            <h3>Zone-Level Booking Controls</h3>
            <CommandButton command="admin.pricing.saveBooking" className="primary-btn" type="button">
              Save
            </CommandButton>
          </div>
          <div className="settings-grid">
            <label>
              Max Trip Distance (Radar)
              <input defaultValue="30 km" />
            </label>
            <label>
              Max Trip Distance (Reservations)
              <input defaultValue="60 km" />
            </label>
            <label>
              Max Trip Distance (Exclusive)
              <input defaultValue="120 km" />
            </label>
            <fieldset>
              <legend>Allowed Payment Methods</legend>
              <label>
                <input type="checkbox" defaultChecked /> Cash
              </label>
              <label>
                <input type="checkbox" defaultChecked /> Credit Card
              </label>
              <label>
                <input type="checkbox" defaultChecked /> Wallet
              </label>
              <label>
                <input type="checkbox" defaultChecked /> PayPal
              </label>
            </fieldset>
          </div>
        </article>
      </TabPanel>

      <TabPanel id="rules" activeId={tab}>
        <article className="panel">
          <h3>Fare Calculation Order</h3>
          <ol className="rules-list">
            <li>Base fare (pickup + km + min)</li>
            <li>Rider adjustment (within Min/Max Increase by Rider limits)</li>
            <li>Boost multiplier</li>
            <li>Apply System Min/Max</li>
            <li>Add extras (waiting, cancellation, reservation, surcharges)</li>
          </ol>
        </article>
      </TabPanel>

      <TabPanel id="boost" activeId={tab}>
        <article className="panel">
          <div className="panel-title-row">
            <h3>Boost Pricing Controls</h3>
            <div>
              <CommandButton command="admin.pricing.saveSurge" className="primary-btn" type="button">
                Save All
              </CommandButton>
              <CommandButton command="admin.pricing.clearSurge" className="secondary-btn" type="button">
                Clear All
              </CommandButton>
            </div>
          </div>
          <div className="boost-grid">
            <div className="setting-card">
              <h4>Manual Boost</h4>
              <strong>1.5x</strong>
              <label>
                Duration (minutes)
                <input defaultValue="30" />
              </label>
              <CommandButton command="admin.pricing.activateBoost" className="primary-btn" type="button">
                Activate
              </CommandButton>
              <CommandButton command="admin.pricing.saveBoost" className="secondary-btn" type="button">
                Save
              </CommandButton>
            </div>
            <div className="setting-card">
              <h4>Auto Boost</h4>
              <strong>1.8x</strong>
              <label>
                Trigger Threshold %
                <input defaultValue="85" />
              </label>
              <CommandButton command="admin.pricing.enableAuto" className="primary-btn" type="button">
                Enable Auto
              </CommandButton>
              <CommandButton command="admin.pricing.saveAuto" className="secondary-btn" type="button">
                Save
              </CommandButton>
            </div>
            <div className="setting-card">
              <h4>Scheduled Boost</h4>
              <strong>2.0x</strong>
              <label>
                Start Time
                <input type="time" defaultValue="17:00" />
              </label>
              <label>
                End Time
                <input type="time" defaultValue="20:00" />
              </label>
              <CommandButton command="admin.pricing.schedule" className="primary-btn" type="button">
                Schedule
              </CommandButton>
              <CommandButton command="admin.pricing.saveSchedule" className="secondary-btn" type="button">
                Save
              </CommandButton>
            </div>
          </div>
        </article>
      </TabPanel>

      <TabPanel id="commission" activeId={tab}>
        <article className="panel">
          <div className="panel-title-row">
            <h3>Commission Settings</h3>
            <CommandButton command="admin.pricing.saveRules" className="primary-btn" type="button">
              Save All
            </CommandButton>
          </div>
          <div className="boost-grid">
            <div className="setting-card">
              <h4>Standard Commission</h4>
              <strong>15%</strong>
              <p>Applicable to all categories</p>
              <CommandButton command="admin.pricing.applyOne" className="primary-btn" type="button">
                Apply
              </CommandButton>
            </div>
            <div className="setting-card">
              <h4>Premium Commission</h4>
              <strong>20%</strong>
              <p>For Premium & XL categories</p>
              <CommandButton command="admin.pricing.applyTwo" className="primary-btn" type="button">
                Apply
              </CommandButton>
            </div>
            <div className="setting-card">
              <h4>Partner Commission</h4>
              <strong>12%</strong>
              <p>For franchise partners</p>
              <CommandButton command="admin.pricing.applyThree" className="primary-btn" type="button">
                Apply
              </CommandButton>
            </div>
          </div>
        </article>
      </TabPanel>

      <Modal open={categoryModalOpen} title="Create New Vehicle Category" onClose={closeModal}>
        <label>
          Category Name
          <input />
        </label>
        <label>
          Description
          <textarea />
        </label>
        <div className="two-col">
          <label>
            Base Fare
            <input type="number" />
          </label>
          <label>
            Per KM Rate
            <input type="number" />
          </label>
          <label>
            Per Minute Rate
            <input type="number" />
          </label>
          <label>
            Minimum Fare
            <input type="number" />
          </label>
        </div>
        <fieldset>
          <legend>Applicable Zones</legend>
          <label>
            <input type="checkbox" /> Norrmalm
          </label>
          <label>
            <input type="checkbox" /> Södermalm
          </label>
          <label>
            <input type="checkbox" /> Östermalm
          </label>
        </fieldset>
        <div className="modal-actions">
          <CommandButton command="admin.pricing.cancelCategory" className="secondary-btn modal-close-action" type="button" onDone={closeModal}>
            Cancel
          </CommandButton>
          <CommandButton command="admin.pricing.createCategory" className="primary-btn" type="button" onDone={closeModal}>
            Create Category
          </CommandButton>
        </div>
      </Modal>
    </>
  );
}
