import { Search } from "lucide-react";
import { allCategoryCount, categoryNames, cleanedCategoryCounts, specialtiesForCategory } from "../data/specialtyPlanning";
import { ALL_VALUE } from "../lib/scoring";
import type { Filters } from "../types";

interface PlannerSearchBarProps {
  filters: Filters;
  states: string[];
  onChange: (filters: Filters) => void;
}

export function PlannerSearchBar({ filters, states, onChange }: PlannerSearchBarProps) {
  function setCategory(category: string) {
    if (category === ALL_VALUE) {
      onChange({
        ...filters,
        specialtyCategory: ALL_VALUE,
        specialtySubcategory: ALL_VALUE,
        specialty: ALL_VALUE,
      });
      return;
    }

    const specialty = specialtiesForCategory(category)[0];
    onChange({
      ...filters,
      specialtyCategory: category,
      specialtySubcategory: specialty.subcategory,
      specialty: specialty.specialty,
      capability: specialty.capability,
    });
  }

  return (
    <div className="planner-search" aria-label="Planner search controls">
      <label>
        <span>Region</span>
        <select value={filters.state} onChange={(event) => onChange({ ...filters, state: event.target.value, district: ALL_VALUE, subDistrict: ALL_VALUE, pinCode: ALL_VALUE })}>
          {[ALL_VALUE, ...states].map((state) => (
            <option key={state} value={state}>
              {state === ALL_VALUE ? "All India" : state}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Specialties</span>
        <select value={filters.specialtyCategory} onChange={(event) => setCategory(event.target.value)}>
          <option value={ALL_VALUE}>All categories ({allCategoryCount})</option>
          {categoryNames.map((category) => (
            <option key={category} value={category}>
              {category} ({cleanedCategoryCounts[category] ?? 1})
            </option>
          ))}
        </select>
      </label>
      <label className="keyword-field">
        <span>Keywords</span>
        <input value={filters.keyword} placeholder="district, hospital, device..." onChange={(event) => onChange({ ...filters, keyword: event.target.value })} />
      </label>
      <button className="search-button" type="button" aria-label="Search">
        <Search size={19} />
      </button>
    </div>
  );
}
