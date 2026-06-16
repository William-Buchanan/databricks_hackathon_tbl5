import { categoryNames, cleanedCategoryCounts, specialtiesForCategory } from "../data/specialtyPlanning";
import type { Filters } from "../types";

interface SpecialtyPlanningControlsProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export function SpecialtyPlanningControls({ filters, onChange }: SpecialtyPlanningControlsProps) {
  const specialties = specialtiesForCategory(filters.specialtyCategory);

  function setCategory(category: string) {
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
          {categoryNames.map((category) => (
            <option key={category} value={category}>
              {category} ({cleanedCategoryCounts[category] ?? 1})
            </option>
          ))}
        </select>
      </label>
      <label className="field-label">
        <span>Specialty</span>
        <select value={filters.specialty} onChange={(event) => setSpecialty(event.target.value)}>
          {specialties.map((profile) => (
            <option key={profile.specialty} value={profile.specialty}>
              {profile.specialty}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
