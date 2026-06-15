export type Capability =
  | "Emergency Cardiology"
  | "Maternal ICU"
  | "Trauma Care"
  | "Neonatal ICU"
  | "Oncology Infusion";

export type BudgetBand = "Low" | "Medium" | "High";

export type OperationalStatus = "Operational" | "Limited" | "Closed" | "Unknown";

export type MatrixStatus =
  | "Verified Care Desert"
  | "Data-Poor Region"
  | "Monitored Access"
  | "Low Priority Audit";

export interface DataCompletenessLog {
  updatedDaysAgo: number;
  missingOperationalFields: number;
  sourceConfidence: number;
  hasRecentSurvey: boolean;
}

export interface FacilityRecord {
  id: string;
  uniqueId?: string;
  state: string;
  district: string;
  subDistrict: string;
  pinCode: string;
  villageTown: string;
  localPopulation: number;
  facilityName: string;
  latitude: number;
  longitude: number;
  capabilities: Capability[];
  specializedBeds: Partial<Record<Capability, number>>;
  operationalStatus: OperationalStatus;
  dataCompleteness: DataCompletenessLog;
  distanceToTertiaryMinutes: number;
  facebookLink?: string;
  sourceUrls?: string[];
  officialWebsite?: string;
  officialPhone?: string;
  h3Index7?: string;
  accuracyConfidence?: number;
  confidenceCategory?: string;
  semanticConsistencyScore?: number;
  recentActivityScore?: number;
  dataCompletenessScore?: number;
  sourceQualityScore?: number;
  hospitalDirectoryScore?: number;
  mismatchDetectionScore?: number;
  source?: string;
  sourceTypes?: string[];
}

export interface RegionAggregate {
  id: string;
  state: string;
  district: string;
  subDistrict: string;
  pinCode: string;
  villageTown: string;
  latitude: number;
  longitude: number;
  population: number;
  facilityCount: number;
  capableFacilityCount: number;
  capableBeds: number;
  trustScore: number;
  riskScore: number;
  status: MatrixStatus;
  nearestTertiaryMinutes: number;
  facilities: FacilityRecord[];
}

export interface Filters {
  capability: Capability;
  specialtyCategory: string;
  specialtySubcategory: string;
  specialty: string;
  budgetBand: BudgetBand;
  budgetCrore: number;
  keyword: string;
  state: string;
  district: string;
  subDistrict: string;
  pinCode: string;
}

export interface SpecialtyPlanningProfile {
  category: string;
  subcategory: string;
  specialty: string;
  capability: Capability;
  lifeCriticality: 1 | 2 | 3 | 4 | 5;
  costTier: 1 | 2 | 3 | 4 | 5;
  expectedLift: 1 | 2 | 3 | 4 | 5;
  rationale: string;
  gbdEvidence: GbdLifeThreateningEvidence;
}

export interface GbdLifeThreateningEvidence {
  plannerCategory: string;
  plannerSubcategory: string;
  plannerSpecialty: string;
  primaryCause: string;
  causeGroup: string;
  preferredMeasure: string;
  secondaryMeasure: string;
  lifeThreateningScore: 1 | 2 | 3 | 4 | 5;
  mortalityRelevance: 1 | 2 | 3 | 4 | 5;
  yllRelevance: 1 | 2 | 3 | 4 | 5;
  emergencySensitivity: 1 | 2 | 3 | 4 | 5;
  scoreMethod: string;
  sourceName: string;
  sourceUrl: string;
  extractScope: string;
  notes: string;
}

export interface PlanningScenario {
  id: string;
  name: string;
  createdAt: string;
  filters: Filters;
  flaggedRegionIds: string[];
  notes: string;
}

export interface RouteSummary {
  origin: {
    latitude: number;
    longitude: number;
  };
  destinationRegionId: string;
  destinationName: string;
  distanceText: string;
  durationText: string;
  mode: "Driving";
  status: "ready" | "error";
  message: string;
}
