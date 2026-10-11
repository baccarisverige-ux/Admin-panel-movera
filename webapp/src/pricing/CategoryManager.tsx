import { useState } from "react";
import { Archive, Lock, Pencil, Plus, ShieldAlert, Tags, Undo2, X } from "lucide-react";
import { CommandButton } from "../ui/CommandButton";
import { useDialogFocus } from "../ui/useDialogFocus";
import {
  SLICE_KEY,
  addCategory,
  archiveCategory,
  editCategory,
  restoreCategory,
  restoreDeadline,
  usageBlocks,
  validateCategory,
  type CategoryUsage,
  type PricingStore,
} from "./zonePricing";

type Props = {
  store: PricingStore;
  usageOf: (categoryId: string) => CategoryUsage;
  agentId: string | null;
  canEdit: boolean;
  locale: string;
  onClose: () => void;
  onNotice: (message: string) => void;
};

type Form = { label: string; line: string; seats: number };

/** Add, rename or delete categories. Delete is a safe archive, blocked while anything uses it. */
export function CategoryManager({ store, usageOf, agentId, canEdit, locale, onClose, onNotice }: Props) {
  const root = useDialogFocus(true, onClose);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({ label: "", line: "", seats: 4 });
  const [adding, setAdding] = useState(false);
  const now = new Date().toISOString();
  const active = store.categories.filter((category) => !category.archived);
  const archived = store.categories.filter((category) => category.archived);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  const formError = adding || editing ? validateCategory(store, { ...form, id: editing ?? undefined }) : null;
  const added = adding ? addCategory(store, form) : null;
  const edited = editing ? editCategory(store, editing, form) : null;

  return (
    <div ref={root} tabIndex={-1} className="modal open" role="dialog" aria-modal="true" aria-label="Manage categories">
      <div className="modal-card cat-manager">
        <div className="cat-manager-head">
          <span className="test-ride-icon"><Tags size={18} aria-hidden="true" /></span>
          <div>
            <h3>Categories</h3>
            <small>Used in every country and zone. Each zone turns a category on or off and sets its own prices.</small>
          </div>
          <button data-command="admin.confirm.cancel" type="button" className="icon-ghost" aria-label="Close categories" onClick={onClose}><X size={16} aria-hidden="true" /></button>
        </div>

        <ul className="cat-list">
          {active.map((category) => {
            const usage = usageOf(category.id);
            const blocks = usageBlocks(usage);
            const isEditing = editing === category.id;
            const isDeleting = deleting === category.id;
            const archive = agentId ? archiveCategory(store, category.id, usage, agentId, "Category deleted", now) : { store, error: "Sign in again." };
            return (
              <li key={category.id} className={isDeleting ? "deleting" : undefined}>
                {isEditing ? (
                  <div className="cat-form">
                    <input aria-label="Category name" value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} />
                    <input aria-label="Category line" value={form.line} onChange={(event) => setForm({ ...form, line: event.target.value })} />
                    <input aria-label="Category seats" type="number" min={1} max={8} value={form.seats} onChange={(event) => setForm({ ...form, seats: Number(event.target.value) })} />
                    {formError ? <small className="form-error">{formError}</small> : null}
                    <div className="cat-actions">
                      <CommandButton command="admin.pricing.editCategory" className="dash-btn small" targetId={category.id} confirmTarget={false} scope="all" before={category.label} after={form.label} expectedSliceRev={store.draftRev} sliceKey={SLICE_KEY} value={edited?.store} disabled={!canEdit || Boolean(formError)} onDone={() => { setEditing(null); onNotice(`${form.label} saved.`); }}>Save</CommandButton>
                      <button data-command="admin.pricing.cancelCategory" type="button" className="dash-btn small ghost" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="cat-info">
                      <strong>{category.label}</strong>
                      <small>{category.line} · {category.seats} seats</small>
                      <span className="cat-usage">{blocks.length ? blocks.join(" · ") : "Not used right now"}</span>
                    </div>
                    <div className="cat-actions">
                      <button data-command="admin.pricing.edit" type="button" className="icon-ghost" aria-label={`Edit ${category.label}`} disabled={!canEdit} onClick={() => { setEditing(category.id); setDeleting(null); setAdding(false); setForm({ label: category.label, line: category.line, seats: category.seats }); }}><Pencil size={15} aria-hidden="true" /></button>
                      <button data-command="admin.pricing.edit" type="button" className="icon-ghost danger" aria-label={`Delete ${category.label}`} disabled={!canEdit} onClick={() => setDeleting(isDeleting ? null : category.id)}><Archive size={15} aria-hidden="true" /></button>
                    </div>
                  </>
                )}
                {isDeleting ? (
                  <div className="delete-check" role="region" aria-label={`Delete ${category.label}`}>
                    <ShieldAlert size={18} aria-hidden="true" />
                    {blocks.length ? (
                      <div>
                        <strong>{category.label} cannot be deleted now</strong>
                        <p>It is still in use: {blocks.join(", ")}. Move these to another category first.</p>
                      </div>
                    ) : (
                      <div>
                        <strong>Delete {category.label}?</strong>
                        <p>Riders stop seeing it in every zone. It is archived and can be restored for 30 days. You will type its name and give a reason.</p>
                        <CommandButton command="admin.pricing.archiveCategory" className="dash-btn small danger" targetId={category.label} scope="all" before={`${category.label} active`} after={`${category.label} archived`} expectedSliceRev={store.draftRev} sliceKey={SLICE_KEY} value={archive.store} disabled={!canEdit || Boolean(archive.error)} title={archive.error} onDone={() => { setDeleting(null); onNotice(`${category.label} deleted. You can restore it for 30 days.`); }}>
                          <Lock size={13} aria-hidden="true" /> Delete safely
                        </CommandButton>
                      </div>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        {adding ? (
          <div className="cat-form add">
            <input aria-label="New category name" placeholder="Name riders see, e.g. Women Driver" value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} />
            <input aria-label="New category line" placeholder="Short line under the name" value={form.line} onChange={(event) => setForm({ ...form, line: event.target.value })} />
            <input aria-label="New category seats" type="number" min={1} max={8} value={form.seats} onChange={(event) => setForm({ ...form, seats: Number(event.target.value) })} />
            {formError ? <small className="form-error">{formError}</small> : <small className="fine">Starts off in every zone, with Movera's prices to edit.</small>}
            <div className="cat-actions">
              <CommandButton command="admin.pricing.createCategory" className="dash-btn small" targetId={form.label || "new-category"} confirmTarget={false} scope="all" before="none" after={form.label} expectedSliceRev={store.draftRev} sliceKey={SLICE_KEY} value={added?.store} disabled={!canEdit || Boolean(formError)} onDone={() => { setAdding(false); onNotice(`${form.label} added. Turn it on in the zones where it should be sold.`); }}>Add category</CommandButton>
              <button data-command="admin.pricing.cancelCategory" type="button" className="dash-btn small ghost" onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button data-command="admin.pricing.addCategory" type="button" className="dash-btn small" disabled={!canEdit} onClick={() => { setAdding(true); setEditing(null); setDeleting(null); setForm({ label: "", line: "", seats: 4 }); }}>
            <Plus size={14} aria-hidden="true" /> New category
          </button>
        )}

        {archived.length ? (
          <div className="cat-archived">
            <h4>Deleted (can be restored for 30 days)</h4>
            <ul>
              {archived.map((category) => {
                const restore = restoreCategory(store, category.id, Date.now());
                const deadline = restoreDeadline(category);
                return (
                  <li key={category.id}>
                    <span><strong>{category.label}</strong><small>Deleted {date.format(Date.parse(category.archived!.at))} by {category.archived!.by} · until {deadline ? date.format(deadline) : "—"}</small></span>
                    <CommandButton command="admin.pricing.restoreCategory" className="dash-btn small ghost" targetId={category.id} confirmTarget={false} scope="all" before="archived" after="active" expectedSliceRev={store.draftRev} sliceKey={SLICE_KEY} value={restore.store} disabled={!canEdit || Boolean(restore.error)} title={restore.error} onDone={() => onNotice(`${category.label} restored.`)}>
                      <Undo2 size={13} aria-hidden="true" /> Restore
                    </CommandButton>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
