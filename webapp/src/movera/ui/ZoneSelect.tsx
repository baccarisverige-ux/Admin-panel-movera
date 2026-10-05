import { FARE_ZONE_OPTIONS, ZONE_OPTIONS } from "../data/catalog";

type ZoneSelectProps = {
  includeAll?: boolean;
  compact?: boolean;
  id?: string;
  defaultValue?: string;
  placeholderOption?: string;
};

export function ZoneSelect({
  includeAll = true,
  compact = true,
  id,
  defaultValue,
  placeholderOption,
}: ZoneSelectProps) {
  const options: string[] = includeAll ? [...ZONE_OPTIONS] : [...FARE_ZONE_OPTIONS];
  if (placeholderOption) options.unshift(placeholderOption);
  return (
    <select
      className={compact ? "compact-select" : undefined}
      id={id}
      defaultValue={defaultValue ?? options[0]}
    >
      {options.map((zone) => (
        <option key={zone}>{zone}</option>
      ))}
    </select>
  );
}
