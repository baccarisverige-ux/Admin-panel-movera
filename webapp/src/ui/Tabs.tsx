import type { ReactNode } from "react";

export type TabItem = {
  id: string;
  label: string;
};

type TabsProps = {
  tabs: readonly TabItem[] | readonly string[];
  activeId: string;
  onChange: (id: string) => void;
};

export function tabIdFromLabel(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "-");
}

function asItems(tabs: TabsProps["tabs"]): TabItem[] {
  return tabs.map((tab) =>
    typeof tab === "string" ? { id: tabIdFromLabel(tab), label: tab } : tab,
  );
}

export function Tabs({ tabs, activeId, onChange }: TabsProps) {
  const items = asItems(tabs);

  function selectTab(id: string) {
    onChange(id);
  }

  return (
    <div className="tabs">
      {items.map((tab) => (
        <button
          data-command="admin.tabs.select"
          key={tab.id}
          type="button"
          aria-pressed={tab.id === activeId}
          aria-controls={`tabpanel-${tab.id}`}
          className={tab.id === activeId ? "active" : undefined}
          data-tab={tab.id}
          onClick={() => selectTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

type TabPanelProps = {
  id: string;
  activeId: string;
  children: ReactNode;
};

export function TabPanel({ id, activeId, children }: TabPanelProps) {
  const active = id === activeId;
  return (
    <div
      className={active ? "tab-panel active" : "tab-panel"}
      data-tab-panel={id}
      id={`tabpanel-${id}`}
      hidden={!active}
    >
      {children}
    </div>
  );
}
