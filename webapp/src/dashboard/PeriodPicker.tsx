import { useState } from "react";
import { CalendarDays, CalendarRange } from "lucide-react";
import type { Period, PeriodKind } from "./period";

const PRESETS: { id: PeriodKind; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

type Props = { period: Period; today: string; onChange: (period: Period) => void };

/** Today / Week / Month / Year, one specific date, or a custom range. */
export function PeriodPicker({ period, today, onChange }: Props) {
  const [rangeOpen, setRangeOpen] = useState(period.kind === "range");
  const [from, setFrom] = useState(period.from ?? today);
  const [to, setTo] = useState(period.to ?? today);
  const rangeError = from && to && from > to ? "The start date must be before the end date." : "";

  return (
    <div className="period-picker">
      <div className="segmented" role="radiogroup" aria-label="Period">
        {PRESETS.map((preset) => (
          <button data-command="admin.ui.period"
            key={preset.id}
            type="button"
            role="radio"
            aria-checked={period.kind === preset.id}
            className={period.kind === preset.id ? "active" : undefined}
            onClick={() => {
              setRangeOpen(false);
              onChange({ kind: preset.id });
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <label className={period.kind === "date" ? "date-chip active" : "date-chip"}>
        <CalendarDays size={15} aria-hidden="true" />
        <span className="sr-only">Pick a date</span>
        <input
          type="date"
          value={period.kind === "date" ? period.on : ""}
          max="2099-12-31"
          onChange={(event) => {
            if (!event.target.value) return;
            setRangeOpen(false);
            onChange({ kind: "date", on: event.target.value });
          }}
        />
      </label>
      <button data-command="admin.ui.period" type="button" className={period.kind === "range" || rangeOpen ? "date-chip active" : "date-chip"} aria-expanded={rangeOpen} onClick={() => setRangeOpen((open) => !open)}>
        <CalendarRange size={15} aria-hidden="true" />
        Range
      </button>
      {rangeOpen ? (
        <form
          className="range-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!rangeError) onChange({ kind: "range", from, to });
          }}
        >
          <label>From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} required /></label>
          <label>To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} required /></label>
          <button data-command="admin.ui.period" type="submit" className="dash-btn small" disabled={Boolean(rangeError)}>Apply</button>
          {rangeError ? <p role="alert">{rangeError}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
