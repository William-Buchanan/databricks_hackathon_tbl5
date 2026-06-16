import gbdLifeThreateningCsv from "../../data/gbd_life_threatening_scores.csv?raw";
import type { GbdLifeThreateningEvidence, SpecialtyPlanningProfile } from "../types";

const headers = [
  "planner_category",
  "planner_subcategory",
  "planner_specialty",
  "planner_capability",
  "gbd_primary_cause",
  "gbd_cause_group",
  "gbd_preferred_measure",
  "gbd_secondary_measure",
  "life_threatening_score_1_5",
  "mortality_relevance_1_5",
  "yll_relevance_1_5",
  "emergency_sensitivity_1_5",
  "score_method",
  "source_name",
  "source_url",
  "extract_scope",
  "notes",
] as const;

type GbdCsvHeader = (typeof headers)[number];
type GbdCsvRow = Record<GbdCsvHeader, string>;

export const gbdLifeThreateningEvidence: GbdLifeThreateningEvidence[] = parseCsv(gbdLifeThreateningCsv).map((row) => ({
  plannerCategory: row.planner_category,
  plannerSubcategory: row.planner_subcategory,
  plannerSpecialty: row.planner_specialty,
  primaryCause: row.gbd_primary_cause,
  causeGroup: row.gbd_cause_group,
  preferredMeasure: row.gbd_preferred_measure,
  secondaryMeasure: row.gbd_secondary_measure,
  lifeThreateningScore: score(row.life_threatening_score_1_5),
  mortalityRelevance: score(row.mortality_relevance_1_5),
  yllRelevance: score(row.yll_relevance_1_5),
  emergencySensitivity: score(row.emergency_sensitivity_1_5),
  scoreMethod: row.score_method,
  sourceName: row.source_name,
  sourceUrl: row.source_url,
  extractScope: row.extract_scope,
  notes: row.notes,
}));

export function evidenceForSpecialty(category: string, subcategory: string, specialty: string): GbdLifeThreateningEvidence {
  const categoryRows = gbdLifeThreateningEvidence.filter((row) => row.plannerCategory === category);
  return (
    categoryRows.find((row) => row.plannerSubcategory === subcategory && row.plannerSpecialty === specialty) ??
    bestSpecialtyMatch(categoryRows, specialty) ??
    categoryRows[0] ??
    gbdLifeThreateningEvidence.find((row) => row.plannerCategory === "Other / Needs Review") ??
    gbdLifeThreateningEvidence[0]
  );
}

export function applyGbdEvidence(profile: Omit<SpecialtyPlanningProfile, "gbdEvidence">): SpecialtyPlanningProfile {
  const evidence = evidenceForSpecialty(profile.category, profile.subcategory, profile.specialty);
  return {
    ...profile,
    lifeCriticality: evidence.lifeThreateningScore,
    gbdEvidence: evidence,
  };
}

function score(value: string): 1 | 2 | 3 | 4 | 5 {
  const parsed = Number(value);
  if (parsed <= 1) return 1;
  if (parsed === 2) return 2;
  if (parsed === 3) return 3;
  if (parsed === 4) return 4;
  return 5;
}

function bestSpecialtyMatch(rows: GbdLifeThreateningEvidence[], specialty: string): GbdLifeThreateningEvidence | undefined {
  const specialtyTokens = tokens(specialty);
  const [best] = rows
    .map((row) => ({
      row,
      overlap: tokens(row.plannerSpecialty).filter((token) => specialtyTokens.includes(token)).length,
    }))
    .filter((candidate) => candidate.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap);
  return best?.row;
}

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token.length > 2 && !["and", "the", "for", "care", "center", "centre", "clinic"].includes(token));
}

function parseCsv(csv: string): GbdCsvRow[] {
  const rows = parseRows(csv.trim());
  const [rawHeaders, ...records] = rows;
  if (!rawHeaders || headers.some((header, index) => rawHeaders[index] !== header)) {
    throw new Error("GBD life-threatening CSV headers do not match the expected schema.");
  }
  return records.map((record) =>
    headers.reduce((row, header, index) => {
      row[header] = record[index] ?? "";
      return row;
    }, {} as GbdCsvRow),
  );
}

function parseRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
