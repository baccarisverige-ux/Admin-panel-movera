import { useDirtyWarning } from "../ui/useDirtyWarning";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, GitCompare, ImagePlus, MapPin, Smartphone, TriangleAlert } from "lucide-react";
import { STUDIO_SLOTS, emptyStudio, studioSlot, changeStudio, useSlice, type StudioBook, type StudioText } from "../api/hooks";
import { useSession } from "../auth/SessionContext";
import { can } from "../auth/permissions";
import { CONTENT_OPS_KEY, PHONES, compare, emptyContentOps, extraError, normalizeContentOps, setExtra, slotExtra, type ContentOps, type SlotExtra } from "../content/extra";
import { Card, Check, Choice, Row, Switch } from "../dispatch/fields";
import { MARKETS } from "../markets/markets";
import { useMarketScope } from "../markets/useMarketScope";
import { CommandButton } from "../ui/CommandButton";
import { DiffTable } from "../content/DiffTable";
import { DriverTextsView } from "../content/DriverTexts";

const SLOT_LABEL: Record<string, string> = {
  "driver-home": "Driver app · home",
  "driver-event": "Driver app · event",
  help: "Help pages",
  legal: "Terms and privacy",
  "app-versions": "App versions",
};

function slotLabel(id: string): string {
  return SLOT_LABEL[id] ?? id.replace("rider-banner-", "Rider app · banner ");
}

export function ContentPage() {
  const { agent } = useSession();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "driver-texts" ? "driver-texts" : "slots";
  const scope = useMarketScope();
  const store = useSlice<StudioBook>("studioOps", emptyStudio());
  const extraSlice = useSlice<ContentOps>(CONTENT_OPS_KEY, emptyContentOps());
  const ops = normalizeContentOps(extraSlice.value);
  const [id, setId] = useState<string>("driver-home");
  const [draft, setDraft] = useState<StudioText | null>(null);
  const [extraDraft, setExtraDraft] = useState<SlotExtra | null>(null);
  const [notice, setNotice] = useState("");
  const [phone, setPhone] = useState(PHONES[1].id);
  const [lang, setLang] = useState<"sv" | "en">("sv");
  const [against, setAgainst] = useState<number | null>(null);
  const slot = studioSlot(store.value, id);
  const text = draft ?? slot.draft;
  const extra = extraDraft ?? slotExtra(ops, id);
  const editable = Boolean(agent && can(agent.role, "settings.edit"));
  const size = PHONES.find((item) => item.id === phone) ?? PHONES[1];
  const errorExtra = extraError(extra);
  const zonesHere = MARKETS.filter((item) => extra.countries.includes(item.id)).flatMap((item) => item.zones);
  const base = against === null ? slot.published : slot.history.find((item) => item.version === against)?.text ?? null;
  const diff = base ? compare(base, text) : [];
  const expired = Boolean(text.expiresAt && new Date(text.expiresAt).getTime() < Date.now());
  function patch(v: Partial<StudioText>) {
    setDraft({ ...text, ...v });
  }
  function patchExtra(v: Partial<SlotExtra>) {
    setExtraDraft({ ...extra, ...v });
  }
  function choose(next: string) {
    setId(next);
    setDraft(null);
    setExtraDraft(null);
    setAgainst(null);
    setNotice("");
  }
  function upload(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => patchExtra({ image: { name: file.name, dataUrl: String(reader.result), fit: extra.image?.fit ?? "fill" } });
    reader.readAsDataURL(file);
  }
  useDirtyWarning(Boolean(draft || extraDraft));
  const publishError = changeStudio(store.value, id, text, "publish", agent?.id ?? "").error;
  const imageSrc = extra.image?.dataUrl || text.image;

  return (
    <div className="dx-page gr-page">
      <header className="dx-head">
        <button data-command="admin.content.view" type="button" className="dash-btn ghost dx-back" onClick={() => (globalThis.history.length > 1 ? navigate(-1) : navigate("/"))}><ArrowLeft size={16} aria-hidden="true" /> Back</button>
        <div className="dx-head-text">
          <h2>Content</h2>
          <p>{view === "driver-texts" ? "Island, offer and button texts in the driver app, in English, Swedish, French and Arabic." : "Bilingual content studio. A second agent must publish. Originals and every publication remain in history. Simulation only."}</p>
        </div>
      </header>
      <div className="dash-tabs dx-views" role="tablist" aria-label="Content sections">
        {([["slots", "Content slots"], ["driver-texts", "Driver app texts"]] as const).map(([tabId, label]) => (
          <button data-command="admin.content.view" key={tabId} type="button" role="tab" aria-selected={view === tabId} className={view === tabId ? "active" : undefined} onClick={() => { setNotice(""); setParams(() => { const next = new URLSearchParams(globalThis.location.search); if (tabId === "slots") next.delete("view"); else next.set("view", tabId); return next; }, { replace: true }); }}>{label}</button>
        ))}
      </div>
      <p role="status" className="gr-status">{notice}</p>

      {view === "driver-texts" ? <DriverTextsView editable={editable} onNotice={setNotice} /> : (
      <div className="gr-content">
        <nav className="gr-slots" aria-label="All slots">
          {STUDIO_SLOTS.map((item) => {
            const row = studioSlot(store.value, item);
            const places = slotExtra(ops, item).countries;
            const hidden = !places.includes(scope.market.id);
            return (
              <button data-command="admin.content.slot" key={item} type="button" className={item === id ? "active" : undefined} aria-current={item === id ? "true" : undefined} onClick={() => choose(item)}>
                <b>{slotLabel(item)}</b>
                <small>{row.published ? `Live · v${row.history.at(-1)?.version ?? 1}` : "Not published"}{hidden ? ` · not in ${scope.market.name}` : ""}</small>
              </button>
            );
          })}
        </nav>

        <div className="gr-content-main">
          <label className="gr-field gr-slot-pick">Content slot<select value={id} onChange={(e) => choose(e.target.value)}>{STUDIO_SLOTS.map((x) => <option key={x}>{x}</option>)}</select></label>
          <article className="panel gr-panel">
            <h3>{slotLabel(id)} · published version {slot.history.at(-1)?.version ?? "none"}</h3>
            {expired ? <p className="gr-warn"><TriangleAlert size={13} aria-hidden="true" /> This content has ended and is no longer shown.</p> : null}
            <fieldset disabled={!editable || store.loading}>
              <div className="field-grid">
                <label>Title<input value={text.title} onChange={(e) => patch({ title: e.target.value })} /></label>
                <label>Swedish content<textarea value={text.sv} onChange={(e) => patch({ sv: e.target.value })} /></label>
                <label>English content<textarea value={text.en} onChange={(e) => patch({ en: e.target.value })} /></label>
                <label>Image URL<input value={text.image} onChange={(e) => patch({ image: e.target.value })} /></label>
                <label>Content expiry<input type="datetime-local" value={text.expiresAt} onChange={(e) => patch({ expiresAt: e.target.value })} /></label>
                {id === "app-versions" ? (
                  <>
                    <label>Minimum app version<input value={text.minVersion} onChange={(e) => patch({ minVersion: e.target.value })} /></label>
                    <label>Recommended app version<input value={text.recommendedVersion} onChange={(e) => patch({ recommendedVersion: e.target.value })} /></label>
                    <label><input type="checkbox" checked={text.reaccept} onChange={(e) => patch({ reaccept: e.target.checked })} />Require re-acceptance</label>
                  </>
                ) : null}
              </div>
            </fieldset>
            <div className="actions">
              {(["save", "publish", "rollback"] as const).map((action) => {
                const result = changeStudio(store.value, id, text, action, agent?.id ?? "");
                return <CommandButton key={action} command={`admin.studio.${action}`} className={action === "publish" ? "dash-btn small" : "dash-btn small ghost"} targetId={id} sliceKey="studioOps" value={result.book} expectedSliceRev={store.value.draftRev} confirmTarget={false} disabled={store.loading || Boolean(result.error) || Boolean(draft && action !== "save")} title={result.error} onDone={() => { setDraft(null); setNotice(`${id}: ${action} recorded.`); }}>{action === "save" ? "Save draft" : action === "publish" ? "Publish" : "Roll back"}</CommandButton>;
              })}
            </div>
            <p role="alert" className="gr-help">{publishError}</p>
          </article>

          <Card title="Image, places and app update" icon={<ImagePlus size={15} />} tone="purple" help="Saved apart from the text. Applies when the content is shown.">
            <Row label="Image" help="Upload a picture. Fill covers the whole space and may cut the edges; fit shows the whole picture.">
              <span className="gr-image-row">
                <label className="dash-btn small ghost gr-upload">Upload image<input type="file" accept="image/*" aria-label="Upload image" disabled={!editable} onChange={(e) => upload(e.target.files?.[0])} /></label>
                {extra.image ? <><small>{extra.image.name}</small><button data-command="admin.content.view" type="button" className="dash-btn small ghost" disabled={!editable} onClick={() => patchExtra({ image: null })}>Remove image</button></> : <small>No image uploaded</small>}
              </span>
            </Row>
            <Row label="How the image fits">
              <Choice label="Image fit" value={extra.image?.fit ?? "fill"} disabled={!editable || !extra.image} options={[{ id: "fill", label: "Fill" }, { id: "fit", label: "Fit" }]} onChange={(fit) => extra.image && patchExtra({ image: { ...extra.image, fit } })} />
            </Row>
            <Row label="Countries" help="The content shows only in these countries.">
              <span className="gr-checks">{MARKETS.map((item) => <Check key={item.id} label={item.name} on={extra.countries.includes(item.id)} disabled={!editable} onChange={(on) => patchExtra({ countries: on ? [...extra.countries, item.id] : extra.countries.filter((x) => x !== item.id), zones: on ? extra.zones : extra.zones.filter((zone) => !item.zones.some((z) => z.id === zone)) })} />)}</span>
            </Row>
            <Row label="Only some zones" help="Leave empty to show it in every zone of the chosen countries." on={extra.zones.length > 0}>
              <span className="gr-checks gr-zones" aria-label="Zones"><MapPin size={12} aria-hidden="true" />{zonesHere.map((zone) => <Check key={zone.id} label={zone.name} on={extra.zones.includes(zone.id)} disabled={!editable} onChange={(on) => patchExtra({ zones: on ? [...extra.zones, zone.id] : extra.zones.filter((x) => x !== zone.id) })} />)}</span>
            </Row>
            {id === "app-versions" ? (
              <>
                <Row label="Force update on iPhone" help="People below the minimum version must update before they can book."><Switch label="Force update on iPhone" on={extra.forceUpdate.ios} disabled={!editable} onChange={(ios) => patchExtra({ forceUpdate: { ...extra.forceUpdate, ios } })} /></Row>
                <Row label="Force update on Android"><Switch label="Force update on Android" on={extra.forceUpdate.android} disabled={!editable} onChange={(android) => patchExtra({ forceUpdate: { ...extra.forceUpdate, android } })} /></Row>
              </>
            ) : null}
            {errorExtra ? <p role="alert" className="gr-warn">{errorExtra}</p> : null}
            <div className="actions">
              <CommandButton command="admin.content.extra" className="dash-btn small" targetId={id} sliceKey={CONTENT_OPS_KEY} value={setExtra(ops, id, extra)} expectedSliceRev={ops.draftRev} confirmTarget={false} disabled={!editable || !extraDraft || Boolean(errorExtra) || extraSlice.loading} onDone={() => { setExtraDraft(null); setNotice(`${id}: image, places and app update saved.`); }}>Save image and places</CommandButton>
              {extraDraft ? <button data-command="admin.content.view" type="button" className="dash-btn small ghost" onClick={() => setExtraDraft(null)}>Undo changes</button> : null}
            </div>
          </Card>

          <Card title="Compare versions" icon={<GitCompare size={15} />} tone="blue" help="What the draft changes, field by field.">
            <label className="gr-field"><span>Compare the draft with</span>
              <select aria-label="Compare with" value={against ?? ""} onChange={(e) => setAgainst(e.target.value ? Number(e.target.value) : null)}>
                <option value="">What is live now</option>
                {slot.history.map((h) => <option key={h.version} value={h.version}>v{h.version} · {h.action} · {h.actor}</option>)}
              </select>
            </label>
            {!base ? <p className="dx-calm">Nothing published yet to compare with.</p> : diff.length ? (
              <DiffTable rows={diff} />
            ) : <p className="dx-calm">The draft is the same as this version.</p>}
            <ol aria-label="Content history" className="gr-events">{slot.history.map((h) => <li key={h.version}>v{h.version} · {h.action} · {h.actor} · {h.at} · {h.text.en}</li>)}</ol>
          </Card>
        </div>

        <aside className="gr-phone" aria-label="Phone preview">
          <h3><Smartphone size={15} aria-hidden="true" /> Phone preview</h3>
          <Choice label="Phone size" value={phone} options={PHONES.map((item) => ({ id: item.id, label: item.label }))} onChange={setPhone} />
          <Choice label="Preview language" value={lang} options={[{ id: "sv", label: "Swedish" }, { id: "en", label: "English" }]} onChange={setLang} />
          <div className="gr-phone-frame" style={{ width: size.width, minHeight: size.height }}>
            <span className="gr-phone-bar" />
            {imageSrc ? <img className={`gr-phone-img ${extra.image?.fit ?? "fill"}`} src={imageSrc} alt="" /> : null}
            <div className="gr-phone-card">
              <p><b>{text.title}</b></p>
              <p>{lang === "sv" ? text.sv : text.en}</p>
            </div>
          </div>
          <p className="gr-help">Shown in {extra.countries.length === MARKETS.length ? "every country" : MARKETS.filter((item) => extra.countries.includes(item.id)).map((item) => item.name).join(", ") || "no country"}{extra.zones.length ? `, ${extra.zones.length} zone${extra.zones.length > 1 ? "s" : ""}` : ""}.</p>
          <p className="gr-help">Published: {slot.published?.en ?? "No publication"}</p>
        </aside>
      </div>
      )}
    </div>
  );
}
