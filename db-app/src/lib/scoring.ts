import type { Capability, FacilityRecord, Filters, MatrixStatus, RegionAggregate } from "../types";

export const ALL_VALUE = "All";

export function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export function applyFilters(records: FacilityRecord[], filters: Filters): FacilityRecord[] {
  return records.filter((record) => {
    return (
      (filters.state === ALL_VALUE || record.state === filters.state) &&
      (filters.district === ALL_VALUE || record.district === filters.district) &&
      (filters.subDistrict === ALL_VALUE || record.subDistrict === filters.subDistrict) &&
      (filters.pinCode === ALL_VALUE || record.pinCode === filters.pinCode)
    );
  });
}

function trustFor(record: FacilityRecord): number {
  const freshness = Math.max(0, 1 - record.dataCompleteness.updatedDaysAgo / 180);
  const fieldCompleteness = Math.max(0, 1 - record.dataCompleteness.missingOperationalFields / 6);
  const statusPenalty = record.operationalStatus === "Unknown" ? 0.18 : record.operationalStatus === "Closed" ? 0.08 : 0;
  const surveyBoost = record.dataCompleteness.hasRecentSurvey ? 0.08 : 0;
  return clamp((freshness * 0.32 + fieldCompleteness * 0.26 + record.dataCompleteness.sourceConfidence * 0.34 + surveyBoost - statusPenalty) * 100);
}

function riskFor(population: number, beds: number, capableFacilities: number, nearestTertiaryMinutes: number): number {
  const demandPressure = Math.min(1, population / Math.max(1, beds * 18000));
  const scarcity = capableFacilities === 0 ? 1 : Math.min(1, 1 / capableFacilities);
  const travel = Math.min(1, nearestTertiaryMinutes / 150);
  return clamp((demandPressure * 0.46 + scarcity * 0.28 + travel * 0.26) * 100);
}

function classify(riskScore: number, trustScore: number): MatrixStatus {
  if (riskScore >= 62 && trustScore >= 62) return "Verified Care Desert";
  if (riskScore >= 62 && trustScore < 62) return "Data-Poor Region";
  if (riskScore < 62 && trustScore >= 62) return "Monitored Access";
  return "Low Priority Audit";
}

export function aggregateRegions(records: FacilityRecord[], capability: Capability): RegionAggregate[] {
  const groups = new Map<string, FacilityRecord[]>();
  records.forEach((record) => {
    const key = `${record.state}|${record.district}|${record.subDistrict}|${record.pinCode}|${record.villageTown}`;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  });

  return Array.from(groups.entries())
    .map(([key, facilities]) => {
      const [state, district, subDistrict, pinCode, villageTown] = key.split("|");
      const population = facilities.reduce((sum, f) => sum + f.localPopulation, 0);
      const capableFacilities = facilities.filter((f) => f.capabilities.includes(capability));
      const capableBeds = capableFacilities.reduce((sum, f) => sum + (f.specializedBeds[capability] ?? 0), 0);
      const trustScore = Math.round(facilities.reduce((sum, f) => sum + trustFor(f), 0) / facilities.length);
      const nearestTertiaryMinutes = Math.min(...facilities.map((f) => f.distanceToTertiaryMinutes));
      const riskScore = Math.round(riskFor(population, capableBeds, capableFacilities.length, nearestTertiaryMinutes));
      return {
        id: `${state}-${district}-${subDistrict}-${pinCode}-${villageTown}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        state,
        district,
        subDistrict,
        pinCode,
        villageTown,
        latitude: avg(facilities.map((f) => f.latitude)),
        longitude: avg(facilities.map((f) => f.longitude)),
        population,
        facilityCount: facilities.length,
        capableFacilityCount: capableFacilities.length,
        capableBeds,
        trustScore,
        riskScore,
        status: classify(riskScore, trustScore),
        nearestTertiaryMinutes,
        facilities,
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore || a.trustScore - b.trustScore);
}

function avg(values: number[]): number {
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(5));
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}
