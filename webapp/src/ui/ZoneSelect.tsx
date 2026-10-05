import { useSearchParams } from "react-router";
import { FARE_ZONE_OPTIONS, ZONE_OPTIONS } from "../api/read";

type ZoneSelectProps = {
  includeAll?: boolean;
  compact?: boolean;
  id?: string;
  defaultValue?: string;
  placeholderOption?: string;
  scoped?: boolean;
};

export function ZoneSelect({
  includeAll = true,
  compact = true,
  id,
  defaultValue,
  placeholderOption,
  scoped = false,
}: ZoneSelectProps) {
  const [params, setParams] = useSearchParams();
  const options: string[] = includeAll ? [...ZONE_OPTIONS] : [...FARE_ZONE_OPTIONS];
  if (placeholderOption) options.unshift(placeholderOption);
  const short = params.get("zone") ?? "";
  const scopedValue =
    options.find((option) => short.length > 0 && option.toLowerCase().startsWith(short.toLowerCase())) ??
    options[0];

  return (
    <select
      className={compact ? "compact-select" : undefined}
      id={id}
      value={scoped ? scopedValue : undefined}
      defaultValue={scoped ? undefined : (defaultValue ?? options[0])}
      onChange={
        scoped
          ? (event) => {
              const next = new URLSearchParams(params);
              const value = event.target.value;
              if (value === "All Stockholm zones") next.delete("zone");
              else next.set("zone", value.split(" (")[0] ?? value);
              setParams(next);
            }
          : undefined
      }
    >
      {options.map((zone) => (
        <option key={zone}>{zone}</option>
      ))}
    </select>
  );
}
