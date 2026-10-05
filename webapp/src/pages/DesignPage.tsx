import { useState } from "react";
import { ACTION_REASONS } from "../domain/labels";
import { useSession } from "../auth/SessionContext";
import { DataTable } from "../ui/DataTable";
import { Can, ConfirmDialog, DateTime, DetailLayout, DiffView, DocumentViewer, Drawer, Duration, EmptyState, ErrorState, Money, PhonePreview, StatusDot, Timeline, Toast, useDirty } from "../ui/kit";

export function DesignPage() {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [tableState, setTableState] = useState<"ready" | "loading" | "error">("ready");
  const form = useDirty("Norrmalm");
  const role = session.agent?.role ?? "support";

  return (
    <>
      <div className="page-heading">
        <div>
          <h2>Design</h2>
          <p>Every shared component. Super admin only.</p>
        </div>
      </div>
      <article className="panel">
        <StatusDot tone="green">Active</StatusDot>
        <StatusDot tone="amber">In review</StatusDot>
        <StatusDot tone="red">Rejected</StatusDot>
        <StatusDot tone="muted">Offline</StatusDot>
        <p><Money ore={25900} /> · <DateTime iso="2026-10-05T12:32:00Z" /> · <Duration seconds={95} /></p>
        <EmptyState title="Empty state" />
        <ErrorState onRetry={() => setTableState("ready")} />
        <Can role={role} permission="system.read"><p>You can open design.</p></Can>
        <Timeline items={[{ at: "2026-10-05T12:00:00Z", text: "Published" }]} />
        <PhonePreview app="rider">Book a ride in Stockholm.</PhonePreview>
        <PhonePreview app="driver">Offer in Östermalm.</PhonePreview>
        <DiffView before="12 kr" after="14 kr" />
        <Toast text="Saved in demo." />
        <DocumentViewer />
        <label>
          Zone
          <input value={form.value} onChange={(event) => form.setValue(event.target.value)} />
        </label>
        <p>{form.dirty ? "Unsaved change." : "No unsaved change."}</p>
        <button className="secondary-btn" type="button" onClick={() => setDrawer(true)}>Open drawer</button>
        <button className="primary-btn" type="button" onClick={() => setOpen(true)}>Open confirm</button>
        <Drawer open={drawer} title="Quick view" onClose={() => setDrawer(false)}><p>Drawer content.</p></Drawer>
        <ConfirmDialog open={open} record="Erik Lind (D0001)" typed="D0001" reasons={[...ACTION_REASONS]} onConfirm={() => setOpen(false)} onClose={() => setOpen(false)} />
      </article>
      <DetailLayout title="Sample record" status={<StatusDot tone="green">Active</StatusDot>} actions={<button className="secondary-btn" type="button">Action</button>} tabs={<p>Tab</p>}>
        <DataTable head={["Name", "Status"]} rows={[["Erik Lind", "Active"]]} state={tableState} onRetry={() => setTableState("ready")} />
        <button className="link-action" type="button" onClick={() => setTableState("loading")}>Show loading</button>
        <button className="link-action" type="button" onClick={() => setTableState("error")}>Show error</button>
        <DataTable head={["Name"]} rows={[]} />
      </DetailLayout>
    </>
  );
}
