import { useState } from "react";
import { CalendarClock, CarFront } from "lucide-react";
import { Card, Check, Num, Row } from "../dispatch/fields";
import type { MarketId } from "../markets/markets";
import { CommandButton } from "../ui/CommandButton";
import { CATEGORY_LABELS, FUELS, VEHICLE_RULES_KEY, rulesError, rulesImpact, type CarFacts, type CountryRules, type VehicleRules } from "./rules";

/** Category rules per country, with how many cars gain or lose a category before saving. */
export function VehicleRulesView({ rules, country, cars, editable }: { rules: VehicleRules; country: MarketId; cars: readonly CarFacts[]; editable: boolean }) {
  const [draft, setDraft] = useState<CountryRules | null>(null);
  const saved = rules.countries[country];
  const current = draft ?? saved;
  const dirty = Boolean(draft) && JSON.stringify(draft) !== JSON.stringify(saved);
  const error = rulesError(current);
  const impact = rulesImpact(cars, saved, current);
  const patchRule = (category: string, next: Partial<CountryRules["categories"][number]>) => setDraft({ ...current, categories: current.categories.map((rule) => (rule.category === category ? { ...rule, ...next } : rule)) });
  return (
    <div className="vh-settings">
      {!editable ? <p className="dx-readonly">Only admins who can edit vehicles can change these rules.</p> : null}
      <fieldset className="vh-fieldset" disabled={!editable}>
        <Card title="Which car fits which category" icon={<CarFront size={18} />} tone="blue" help="A car can drive every category it fits. The number shows how many cars in the country fit, with your changes.">
          {current.categories.map((rule) => {
            const count = impact.find((item) => item.category === rule.category);
            return (
              <Row key={rule.category} label={CATEGORY_LABELS[rule.category]} help={`${count?.after ?? 0} cars fit${count && count.after !== count.before ? ` (now ${count.before})` : ""}.`} on={rule.on} onToggle={(on) => patchRule(rule.category, { on })}>
                <Num label={`${CATEGORY_LABELS[rule.category]} oldest year`} before="From" value={rule.minYear} min={1990} max={2030} onChange={(value) => patchRule(rule.category, { minYear: value })} />
                <Num label={`${CATEGORY_LABELS[rule.category]} seats`} before="Seats" value={rule.minSeats} min={1} max={9} onChange={(value) => patchRule(rule.category, { minSeats: value })} />
                <span className="vh-fuels">{FUELS.map((fuel) => <Check key={fuel.id} label={fuel.label} on={rule.fuels.includes(fuel.id)} onChange={(on) => patchRule(rule.category, { fuels: on ? [...rule.fuels, fuel.id] : rule.fuels.filter((item) => item !== fuel.id) })} />)}</span>
              </Row>
            );
          })}
        </Card>
        <Card title="Papers and photos" icon={<CalendarClock size={18} />} tone="orange">
          <Row label="Warn before papers expire" help="Insurance and inspection show orange this many days before they run out.">
            <Num label="Warning days" value={current.warnDays} unit="days" min={1} max={120} onChange={(value) => setDraft({ ...current, warnDays: value })} />
          </Row>
          <Row label="Take cars off the road when papers expire" help="A car with expired insurance or inspection is marked Should be on hold." on={current.autoHold} onToggle={(on) => setDraft({ ...current, autoHold: on })} />
          <Row label="Photos must be approved" help="Front, back, side and inside photos are part of the checks." on={current.photosNeeded} onToggle={(on) => setDraft({ ...current, photosNeeded: on })} />
        </Card>
      </fieldset>
      {editable ? (
        <div className="dx-publish">
          <span className="dx-publish-text"><b>{dirty ? "Changes not saved" : "Everything is saved"}</b><small>{error ?? "Rules apply to every car in the country."}</small></span>
          <button data-command="admin.vehicle.view" type="button" className="dash-btn small ghost" disabled={!dirty} onClick={() => setDraft(null)}>Undo changes</button>
          <CommandButton command="admin.vehicle.rules" className="dash-btn small" targetId={`vehicle rules ${country}`} scope="all" confirmTarget={false} before="saved" after="changed" sliceKey={VEHICLE_RULES_KEY} value={{ ...rules, draftRev: rules.draftRev + 1, countries: { ...rules.countries, [country]: current } }} expectedSliceRev={rules.draftRev} disabled={!dirty || Boolean(error)} onDone={() => setDraft(null)}>Save vehicle rules</CommandButton>
        </div>
      ) : null}
    </div>
  );
}
