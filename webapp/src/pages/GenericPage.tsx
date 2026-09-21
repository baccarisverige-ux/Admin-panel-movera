import { useState } from "react";
import {
  catalogFor,
  type ChatCustom,
  type CommunicationsCustom,
  type CustomPage,
  type SettingsCustom,
  type TripsCustom,
} from "../data/catalog";
import { DataTable } from "../ui/DataTable";
import { EntityCards } from "../ui/EntityCards";
import { MapCanvas } from "../ui/MapCanvas";
import { MessageThread } from "../ui/MessageThread";
import { PageHeading } from "../ui/PageHeading";
import { StatsGrid } from "../ui/StatsGrid";
import { TabPanel, Tabs, tabIdFromLabel } from "../ui/Tabs";
import { ZoneSelect } from "../ui/ZoneSelect";

type GenericPageProps = {
  pageId: string;
};

export function GenericPage({ pageId }: GenericPageProps) {
  const entry = catalogFor(pageId);

  return (
    <>
      <PageHeading title={entry.title} subtitle={entry.subtitle}>
        <div className="actions">
          <ZoneSelect />
          <button className="secondary-btn" type="button">
            Refresh
          </button>
        </div>
      </PageHeading>

      {entry.custom ? <CustomSection custom={entry.custom} /> : null}

      {!entry.custom && entry.stats ? <StatsGrid stats={entry.stats} /> : null}
      {!entry.custom && entry.cards ? <EntityCards cards={entry.cards} /> : null}
      {!entry.custom && entry.table ? (
        <article className="panel">
          <div className="panel-title-row">
            <h3>Details</h3>
            <button className="secondary-btn" type="button">
              Export
            </button>
          </div>
          <DataTable head={entry.table.head} rows={entry.table.rows} />
        </article>
      ) : null}
    </>
  );
}

function CustomSection({ custom }: { custom: CustomPage }) {
  switch (custom.kind) {
    case "communications":
      return <CommunicationsView data={custom} />;
    case "trips":
      return <TripsView data={custom} />;
    case "chat":
      return <ChatView data={custom} />;
    case "settings":
      return <SettingsView data={custom} />;
  }
}

function CommunicationsView({ data }: { data: CommunicationsCustom }) {
  const [tab, setTab] = useState(tabIdFromLabel(data.tabs[0]));

  return (
    <>
      <Tabs tabs={data.tabs} activeId={tab} onChange={setTab} />
      <TabPanel id="popups" activeId={tab}>
        <div className="split">
          <article className="panel">
            <div className="panel-title-row">
              <h3>Send Popup Notification</h3>
              <button className="primary-btn" type="button">
                Send Popup
              </button>
            </div>
            <div className="settings-grid">
              <label>
                Target
                <select>
                  {data.targets.map((target) => (
                    <option key={target}>{target}</option>
                  ))}
                </select>
              </label>
              <label>
                Message Type
                <select>
                  {data.messageTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label>
                Zone
                <select>
                  {data.zones.map((zone) => (
                    <option key={zone}>{zone}</option>
                  ))}
                </select>
              </label>
            </div>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "#687386" }}>
              Message
              <textarea placeholder="Type a message" />
            </label>
          </article>
          <article className="panel">
            <div className="panel-title-row">
              <h3>Recent Popups</h3>
            </div>
            <div className="cards-list">
              {data.recentPopups.map((popup) => (
                <div className="entity-card" key={popup.title}>
                  <h4>{popup.title}</h4>
                  <p>{popup.detail}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </TabPanel>
      <TabPanel id="chat" activeId={tab}>
        <article className="panel">
          <div className="panel-title-row">
            <h3>Admin Chat</h3>
          </div>
          <MessageThread thread={data.chat} />
        </article>
      </TabPanel>
      <TabPanel id="notifications" activeId={tab}>
        <article className="panel">
          <div className="panel-title-row">
            <h3>Notifications</h3>
          </div>
          <p>Notification campaigns are listed in Notification System.</p>
        </article>
      </TabPanel>
      <TabPanel id="templates" activeId={tab}>
        <article className="panel">
          <div className="panel-title-row">
            <h3>Templates</h3>
          </div>
          <p>Message templates reuse the popup composer on the Popups tab.</p>
        </article>
      </TabPanel>
    </>
  );
}

function TripsView({ data }: { data: TripsCustom }) {
  return (
    <>
      <article className="panel">
        <div className="panel-title-row">
          <h3>Live Map</h3>
          <button className="secondary-btn" type="button">
            Refresh
          </button>
        </div>
        <MapCanvas labels={data.mapLabels} />
      </article>
      <article className="panel">
        <div className="panel-title-row">
          <h3>Active Trips</h3>
        </div>
        <DataTable head={data.table.head} rows={data.table.rows} />
      </article>
    </>
  );
}

function ChatView({ data }: { data: ChatCustom }) {
  const [tab, setTab] = useState(tabIdFromLabel(data.tabs[0]));
  return (
    <>
      <Tabs tabs={data.tabs} activeId={tab} onChange={setTab} />
      <article className="panel">
        <MessageThread key={tab} thread={data.thread} />
      </article>
    </>
  );
}

function SettingsView({ data }: { data: SettingsCustom }) {
  const [tab, setTab] = useState(tabIdFromLabel(data.tabs[0]));
  return (
    <>
      <Tabs tabs={data.tabs} activeId={tab} onChange={setTab} />
      <TabPanel id="general" activeId={tab}>
        <article className="panel">
          <div className="panel-title-row">
            <h3>General Settings</h3>
            <button className="primary-btn" type="button">
              Save All
            </button>
          </div>
          <div className="settings-grid">
            <label>
              System Name
              <input defaultValue={data.systemName} />
            </label>
            <label>
              Default Currency
              <select defaultValue={data.currencies[0]}>
                {data.currencies.map((currency) => (
                  <option key={currency}>{currency}</option>
                ))}
              </select>
            </label>
            <label>
              Time Zone
              <select defaultValue={data.timeZones[0]}>
                {data.timeZones.map((zone) => (
                  <option key={zone}>{zone}</option>
                ))}
              </select>
            </label>
          </div>
        </article>
      </TabPanel>
      <TabPanel id="security" activeId={tab}>
        <article className="panel">
          <h3>Security Settings</h3>
          <div className="settings-grid" style={{ marginTop: 14 }}>
            <label>
              Session Timeout (minutes)
              <input defaultValue={data.sessionTimeout} />
            </label>
            <label>
              Max Login Attempts
              <input defaultValue={data.maxLoginAttempts} />
            </label>
            <fieldset>
              <legend>Authentication</legend>
              <label>
                <input type="checkbox" defaultChecked /> Require Two-Factor Authentication
              </label>
            </fieldset>
          </div>
        </article>
      </TabPanel>
      <TabPanel id="notifications" activeId={tab}>
        <article className="panel">
          <div className="panel-title-row">
            <h3>Notification Settings</h3>
            <button className="primary-btn" type="button">
              Save All
            </button>
          </div>
          <p>Push, email and SMS campaigns stay on the Notification System screen.</p>
        </article>
      </TabPanel>
      <TabPanel id="integrations" activeId={tab}>
        <article className="panel">
          <div className="panel-title-row">
            <h3>Integration Settings</h3>
            <button className="primary-btn" type="button">
              Save All
            </button>
          </div>
          <p>API keys and gateway status stay on the API & Integration screen.</p>
        </article>
      </TabPanel>
    </>
  );
}
