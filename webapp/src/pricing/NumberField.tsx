import { useEffect, useState } from "react";

type Props = {
  value: number;
  onChange: (value: number) => void;
  label: string;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  changed?: boolean;
  invalid?: boolean;
  title?: string;
  className?: string;
};

/** A number box that lets people type "12," or "0." without the value jumping, with its unit inside. */
export function NumberField({ value, onChange, label, unit, step = 1, min = 0, max, disabled = false, changed = false, invalid = false, title, className }: Props) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText((current) => (Number(current.replace(",", ".")) === value ? current : String(value)));
  }, [value]);
  return (
    <span className={["num-field", changed ? "changed" : "", invalid ? "invalid" : "", className ?? ""].filter(Boolean).join(" ")} title={title}>
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        aria-invalid={invalid || undefined}
        value={text}
        disabled={disabled}
        data-step={step}
        onChange={(event) => {
          const next = event.target.value.replace(/[^\d.,-]/g, "");
          setText(next);
          const parsed = Number(next.replace(",", "."));
          if (next.trim() !== "" && Number.isFinite(parsed)) onChange(max !== undefined ? Math.min(max, Math.max(min, parsed)) : Math.max(min, parsed));
        }}
        onBlur={() => setText(String(value))}
      />
      {unit ? <i aria-hidden="true">{unit}</i> : null}
    </span>
  );
}
