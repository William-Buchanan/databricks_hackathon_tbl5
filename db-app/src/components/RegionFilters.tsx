import type { Filters } from "../types";
import { ALL_VALUE } from "../lib/scoring";

interface RegionFiltersProps {
  filters: Filters;
  options: {
    states: string[];
    districts: string[];
    subDistricts: string[];
    pinCodes: string[];
  };
  onChange: (filters: Filters) => void;
}

export function RegionFilters({ filters, options, onChange }: RegionFiltersProps) {
  function update(key: keyof Filters, value: string) {
    const next = { ...filters, [key]: value };
    if (key === "state") {
      next.district = ALL_VALUE;
      next.subDistrict = ALL_VALUE;
      next.pinCode = ALL_VALUE;
    }
    if (key === "district") {
      next.subDistrict = ALL_VALUE;
      next.pinCode = ALL_VALUE;
    }
    if (key === "subDistrict") {
      next.pinCode = ALL_VALUE;
    }
    onChange(next);
  }

  return (
    <div className="filter-grid">
      <Select label="State" value={filters.state} values={[ALL_VALUE, ...options.states]} onChange={(value) => update("state", value)} />
      <Select label="District" value={filters.district} values={[ALL_VALUE, ...options.districts]} onChange={(value) => update("district", value)} />
      <Select label="Sub-district / City" value={filters.subDistrict} values={[ALL_VALUE, ...options.subDistricts]} onChange={(value) => update("subDistrict", value)} />
      <Select label="PIN Code" value={filters.pinCode} values={[ALL_VALUE, ...options.pinCodes]} onChange={(value) => update("pinCode", value)} />
    </div>
  );
}

function Select({ label, value, values, onChange }: { label: string; value: string; values: string[]; onChange: (value: string) => void }) {
  return (
    <label className="field-label">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {values.map((item) => (
          <option key={item} value={item}>
            {item === ALL_VALUE ? `All ${label.toLowerCase()}` : item}
          </option>
        ))}
      </select>
    </label>
  );
}
