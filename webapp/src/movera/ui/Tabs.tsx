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
  return (
    <div className="tabs">
      {items.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={tab.id === activeId ? "active" : undefined}
          data-tab={tab.id}
          onClick={() => onChange(tab.id)}
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
  return (
    <div
      className={id === activeId ? "tab-panel active" : "tab-panel"}
      data-tab-panel={id}
    >
      {children}
    </div>
  );
}
