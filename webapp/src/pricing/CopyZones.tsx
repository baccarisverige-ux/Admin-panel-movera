import { useState } from "react";
import { Copy, X } from "lucide-react";
import { MARKETS } from "../markets/markets";
import { useDialogFocus } from "../ui/useDialogFocus";
import type { CopyPart } from "./zonePricing";

const PARTS: { id: CopyPart; label: string }[] = [
  { id: "prices", label: "Prices and fixed routes" },
  { id: "fees", label: "Fees" },
  { id: "surge", label: "Surge settings" },
  { id: "commission", label: "Commission" },
  { id: "pickup", label: "Pickup pay" },
];

type Props = {
  fromZoneId: string;
  fromName: string;
  /** Parts ticked when the dialog opens. */
  initialParts?: CopyPart[];
  allowed: (zoneId: string) => boolean;
  onCopy: (zoneIds: string[], parts: CopyPart[]) => void;
  onClose: () => void;
};

/** Copy this zone's set into other zones as drafts. Nothing goes live until it is published. */
export function CopyZones({ fromZoneId, fromName, initialParts = ["prices", "fees"], allowed, onCopy, onClose }: Props) {
  const root = useDialogFocus(true, onClose);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [parts, setParts] = useState<Set<CopyPart>>(() => new Set(initialParts));
  const toggle = <T,>(set: Set<T>, value: T) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  };
  return (
    <div ref={root} tabIndex={-1} className="modal open" role="dialog" aria-modal="true" aria-label="Copy prices to other zones">
      <div className="modal-card copy-card">
        <div className="cat-manager-head">
          <span className="test-ride-icon"><Copy size={18} aria-hidden="true" /></span>
          <div>
            <h3>Copy {fromName} to other zones</h3>
            <small>Copies go into drafts. Amounts are converted when the country differs. Publish to make them live.</small>
          </div>
          <button data-command="admin.confirm.cancel" type="button" className="icon-ghost" aria-label="Close copy" onClick={onClose}><X size={16} aria-hidden="true" /></button>
        </div>
        <fieldset className="copy-parts">
          <legend>What to copy</legend>
          {PARTS.map((part) => (
            <label key={part.id} className={parts.has(part.id) ? "check-chip on" : "check-chip"}>
              <input type="checkbox" checked={parts.has(part.id)} onChange={() => setParts(toggle(parts, part.id))} />
              {part.label}
            </label>
          ))}
        </fieldset>
        {MARKETS.map((item) => {
          const zones = item.zones.filter((zone) => zone.id !== fromZoneId && allowed(zone.id));
          if (!zones.length) return null;
          return (
            <fieldset key={item.id} className="copy-zones">
              <legend>
                {item.name}
                <button data-command="admin.pricing.copyZones" type="button" className="link-action" onClick={() => setPicked((current) => {
                  const next = new Set(current);
                  const all = zones.every((zone) => next.has(zone.id));
                  for (const zone of zones) if (all) next.delete(zone.id); else next.add(zone.id);
                  return next;
                })}>{zones.every((zone) => picked.has(zone.id)) ? "None" : "All"}</button>
              </legend>
              <div className="copy-zone-grid">
                {zones.map((zone) => (
                  <label key={zone.id} className={picked.has(zone.id) ? "check-chip on" : "check-chip"}>
                    <input type="checkbox" aria-label={`Copy to ${zone.name}`} checked={picked.has(zone.id)} onChange={() => setPicked(toggle(picked, zone.id))} />
                    {zone.name}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}
        <div className="cat-actions end">
          <button data-command="admin.confirm.cancel" type="button" className="dash-btn ghost" onClick={onClose}>Cancel</button>
          <button data-command="admin.pricing.copyZones" type="button" className="dash-btn" disabled={!picked.size || !parts.size} onClick={() => onCopy([...picked], [...parts])}>
            Copy to {picked.size} zone{picked.size === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
}
