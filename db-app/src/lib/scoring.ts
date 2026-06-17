import type { Capability, FacilityRecord, Filters, H3DensityMetrics, ZoneStatus, RegionAggregate } from "../types";

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

function riskFor(population: number, beds: number, capableFacilities: number, nearestTertiaryMinutes: number, h3DensityMetrics?: H3DensityMetrics): number {
  const demandPressure = Math.min(1, population / Math.max(1, beds * 18000));
  const scarcity = capableFacilities === 0 ? 1 : Math.min(1, 1 / capableFacilities);
  const travel = Math.min(1, nearestTertiaryMinutes / 150);
  if (!h3DensityMetrics) return clamp((demandPressure * 0.46 + scarcity * 0.28 + travel * 0.26) * 100);
  const h3Pressure = h3DensityPressure(h3DensityMetrics);
  return clamp((demandPressure * 0.4 + scarcity * 0.24 + travel * 0.22 + h3Pressure * 0.14) * 100);
}

function classify(riskScore: number, trustScore: number): ZoneStatus {
  if (riskScore >= 62 && trustScore >= 62) return "Verified Care Desert";
  if (riskScore >= 62 && trustScore < 62) return "Data-Poor Region";
  if (riskScore < 62 && trustScore >= 62) return "Monitored Access";
  return "Low Priority Audit";
}

export function aggregateRegions(records: FacilityRecord[], capability?: Capability): RegionAggregate[] {
  const groups = new Map<string, FacilityRecord[]>();
  records.forEach((record) => {
    const key = `${record.state}|${record.district}|${record.subDistrict}|${record.pinCode}|${record.villageTown}`;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  });

  return Array.from(groups.entries())
    .map(([key, facilities]) => {
      const [state, district, subDistrict, pinCode, villageTown] = key.split("|");
      const actualFacilities = facilities.filter((facility) => facility.recordKind !== "h3-density");
      const population = facilities.reduce((sum, f) => sum + f.localPopulation, 0);
      const populationSource = aggregatePopulationSource(facilities);
      const capableFacilities = capability ? actualFacilities.filter((f) => f.capabilities.includes(capability)) : actualFacilities.filter((f) => f.capabilities.length > 0);
      const capableBeds = capability ? capableFacilities.reduce((sum, f) => sum + (f.specializedBeds[capability] ?? 0), 0) : capableFacilities.reduce((sum, f) => sum + totalSpecializedBeds(f), 0);
      const trustScore = Math.round(facilities.reduce((sum, f) => sum + trustFor(f), 0) / facilities.length);
      const nearestTertiaryMinutes = Math.min(...facilities.map((f) => f.distanceToTertiaryMinutes));
      const h3DensityMetrics = aggregateH3DensityMetrics(facilities);
      const riskScore = Math.round(riskFor(population, capableBeds, capableFacilities.length, nearestTertiaryMinutes, h3DensityMetrics));
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
        populationSource,
        facilityCount: actualFacilities.length,
        capableFacilityCount: capableFacilities.length,
        capableBeds,
        trustScore,
        riskScore,
        status: classify(riskScore, trustScore),
        nearestTertiaryMinutes,
        h3DensityMetrics,
        facilities,
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore || a.trustScore - b.trustScore);
}

function aggregatePopulationSource(facilities: FacilityRecord[]): RegionAggregate["populationSource"] {
  const sources = new Set(facilities.map((facility) => facility.localPopulationSource ?? "unavailable"));
  if (sources.size === 1) return sources.values().next().value as RegionAggregate["populationSource"];
  if (sources.has("source") && (sources.has("synthetic") || sources.has("unavailable"))) return "mixed";
  if (sources.has("synthetic")) return "synthetic";
  return "unavailable";
}

function totalSpecializedBeds(record: FacilityRecord): number {
  return Object.values(record.specializedBeds).reduce((sum, beds) => sum + (beds ?? 0), 0);
}

function aggregateH3DensityMetrics(facilities: FacilityRecord[]): H3DensityMetrics | undefined {
  const byH3 = new Map<string, H3DensityMetrics>();
  facilities.forEach((facility) => {
    if (!facility.h3DensityMetrics) return;
    byH3.set(facility.h3DensityMetrics.h3Index7, facility.h3DensityMetrics);
  });

  const metrics = Array.from(byH3.values());
  if (!metrics.length) return undefined;
  if (metrics.length === 1) return metrics[0];

  return {
    h3Index7: `${metrics.length} H3 cells`,
    uniqueHospitalCount: Math.round(avg(metrics.map((metric) => metric.uniqueHospitalCount))),
    populationDensityPerKm2: avg(metrics.map((metric) => metric.populationDensityPerKm2)),
    hospitalToPopulationDensityRatio: avg(metrics.map((metric) => metric.hospitalToPopulationDensityRatio)),
    normalizedHospPopRatio: avg(metrics.map((metric) => metric.normalizedHospPopRatio)),
  };
}

function h3DensityPressure(metrics: H3DensityMetrics): number {
  const ratioPressure = 1 - Math.min(1, metrics.hospitalToPopulationDensityRatio / 0.0012);
  const densityPressure = Math.min(1, metrics.populationDensityPerKm2 / 20000);
  const hospitalPressure = 1 - Math.min(1, metrics.uniqueHospitalCount / 12);
  return clamp01(ratioPressure * 0.5 + densityPressure * 0.3 + hospitalPressure * 0.2);
}

function avg(values: number[]): number {
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(5));
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
