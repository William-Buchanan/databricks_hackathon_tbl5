import { allCategoryCount, categoryNames, cleanedCategoryCounts, specialtiesForCategory } from "../data/specialtyPlanning";
import { ALL_VALUE } from "../lib/scoring";
import type { Filters } from "../types";

interface SpecialtyPlanningControlsProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export function SpecialtyPlanningControls({ filters, onChange }: SpecialtyPlanningControlsProps) {
  const allCategoriesSelected = filters.specialtyCategory === ALL_VALUE;
  const specialties = allCategoriesSelected ? [] : specialtiesForCategory(filters.specialtyCategory);

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

  function setSpecialty(specialtyName: string) {
    const profile = specialties.find((item) => item.specialty === specialtyName) ?? specialties[0];
    onChange({ ...filters, specialtySubcategory: profile.subcategory, specialty: profile.specialty, capability: profile.capability });
  }

  return (
    <div className="planning-controls">
      <label className="field-label">
        <span>Category</span>
        <select value={filters.specialtyCategory} onChange={(event) => setCategory(event.target.value)}>
          <option value={ALL_VALUE}>All categories ({allCategoryCount})</option>
          {categoryNames.map((category) => (
            <option key={category} value={category}>
              {category} ({cleanedCategoryCounts[category] ?? 1})
            </option>
          ))}
        </select>
      </label>
      <label className="field-label">
        <span>Specialty</span>
        <select value={allCategoriesSelected ? ALL_VALUE : filters.specialty} onChange={(event) => setSpecialty(event.target.value)} disabled={allCategoriesSelected}>
          {allCategoriesSelected ? (
            <option value={ALL_VALUE}>All specialties</option>
          ) : (
            specialties.map((profile) => (
              <option key={profile.specialty} value={profile.specialty}>
                {profile.specialty}
              </option>
            ))
          )}
        </select>
      </label>
    </div>
  );
}
