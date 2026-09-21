import { useState } from "react";
import { PRICE_ROWS, catalogFor } from "../data/catalog";
import { Modal } from "../ui/Modal";
import { PageHeading } from "../ui/PageHeading";
import { TabPanel, Tabs } from "../ui/Tabs";
import { ZoneSelect } from "../ui/ZoneSelect";

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
          <button className="primary-btn" type="button">
            Save All Changes
          </button>
          <button className="secondary-btn" type="button" onClick={() => setCategoryModalOpen(true)}>
            Add Category
          </button>
        </div>
      </PageHeading>

      <Tabs
        tabs={PRICING_TABS}
        activeId={tab}
        onChange={(id) => setTab(id as PricingTabId)}
      />

      <TabPanel id="categories" activeId={tab}>
        <article className="panel">
          <div className="panel-title-row">
            <h3>Vehicle Categories</h3>
            <button className="secondary-btn" type="button">
              Export
            </button>
          </div>
          <div className="table-wrap">
            <table className="pricing-table">
              <thead>
                <tr>
                  <th>Category</th>
                  {RATE_COLUMNS.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={row.category}>
                    <td>
                      <strong>{row.category}</strong>
                    </td>
                    {row.values.map((value, valueIndex) => (
                      <td key={RATE_COLUMNS[valueIndex]}>
                        <input
                          value={value}
                          onChange={(event) => updateRate(rowIndex, valueIndex, event.target.value)}
                        />
                      </td>
                    ))}
                    <td>
                      <button className="link-action" type="button">
                        Save
                      </button>
                      <button className="link-action danger-text" type="button">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </TabPanel>

      <TabPanel id="booking" activeId={tab}>
        <article className="panel">
          <div className="panel-title-row">
            <h3>Zone-Level Booking Controls</h3>
            <button className="primary-btn" type="button">
              Save
            </button>
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
              <button className="primary-btn" type="button">
                Save All
              </button>
              <button className="secondary-btn" type="button">
                Clear All
              </button>
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
              <button className="primary-btn" type="button">
                Activate
              </button>
              <button className="secondary-btn" type="button">
                Save
              </button>
            </div>
            <div className="setting-card">
              <h4>Auto Boost</h4>
              <strong>1.8x</strong>
              <label>
                Trigger Threshold %
                <input defaultValue="85" />
              </label>
              <button className="primary-btn" type="button">
                Enable Auto
              </button>
              <button className="secondary-btn" type="button">
                Save
              </button>
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
              <button className="primary-btn" type="button">
                Schedule
              </button>
              <button className="secondary-btn" type="button">
                Save
              </button>
            </div>
          </div>
        </article>
      </TabPanel>

      <TabPanel id="commission" activeId={tab}>
        <article className="panel">
          <div className="panel-title-row">
            <h3>Commission Settings</h3>
            <button className="primary-btn" type="button">
              Save All
            </button>
          </div>
          <div className="boost-grid">
            <div className="setting-card">
              <h4>Standard Commission</h4>
              <strong>15%</strong>
              <p>Applicable to all categories</p>
              <button className="primary-btn" type="button">
                Apply
              </button>
            </div>
            <div className="setting-card">
              <h4>Premium Commission</h4>
              <strong>20%</strong>
              <p>For Premium & XL categories</p>
              <button className="primary-btn" type="button">
                Apply
              </button>
            </div>
            <div className="setting-card">
              <h4>Partner Commission</h4>
              <strong>12%</strong>
              <p>For franchise partners</p>
              <button className="primary-btn" type="button">
                Apply
              </button>
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
            <input type="checkbox" /> Downtown
          </label>
          <label>
            <input type="checkbox" /> Uptown
          </label>
          <label>
            <input type="checkbox" /> Midtown
          </label>
        </fieldset>
        <div className="modal-actions">
          <button className="secondary-btn modal-close-action" type="button" onClick={closeModal}>
            Cancel
          </button>
          <button className="primary-btn" type="button" onClick={closeModal}>
            Create Category
          </button>
        </div>
      </Modal>
    </>
  );
}
