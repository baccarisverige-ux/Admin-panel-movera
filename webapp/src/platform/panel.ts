/** The admin panel itself: whether the developer pages (System, Release gates, Design) show in the menu. Off by default. */

export const PANEL_OPS_KEY = "panelOps";
export const DEV_PAGES = ["system", "gates", "design"] as const;

export type PanelOps = { draftRev: number; devPages: boolean };

export function emptyPanelOps(): PanelOps {
  return { draftRev: 1, devPages: false };
}

export function normalizePanelOps(value: unknown): PanelOps {
  if (!value || typeof value !== "object") return emptyPanelOps();
  const raw = value as Partial<PanelOps>;
  return { draftRev: typeof raw.draftRev === "number" ? raw.draftRev : 1, devPages: raw.devPages === true };
}

/** Developer pages show in the menu only for the Super admin, and only when the switch is on. */
export function showInMenu(pageId: string, role: string | undefined, ops: PanelOps): boolean {
  if (!(DEV_PAGES as readonly string[]).includes(pageId)) return true;
  return role === "super" && ops.devPages;
}
