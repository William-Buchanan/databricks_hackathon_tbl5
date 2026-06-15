import type { BudgetBand, SpecialtyPlanningProfile } from "../types";
import { cleanedSpecialtyCatalog } from "./cleanedSpecialtyCatalog";

export const interventionLevels: Array<{ label: string; minCrore: number; maxCrore: number; capacity: 1 | 2 | 3 | 4 | 5; description: string }> = [
  { label: "Audit + referral routing", minCrore: 0, maxCrore: 0.25, capacity: 1, description: "Survey, data cleanup, referral protocol, basic equipment" },
  { label: "Stabilization upgrade", minCrore: 0.25, maxCrore: 1, capacity: 2, description: "Staffing, diagnostics, emergency stabilization room" },
  { label: "Specialist clinic / HDU", minCrore: 1, maxCrore: 5, capacity: 3, description: "Specialist days, HDU beds, operating-room readiness" },
  { label: "Full service line", minCrore: 5, maxCrore: 20, capacity: 4, description: "ICU/NICU, dialysis, oncology infusion, advanced imaging" },
  { label: "Tertiary center build-out", minCrore: 20, maxCrore: Infinity, capacity: 5, description: "Cath lab, transplant-scale care, tertiary center of excellence" },
];

export const budgetBands: Array<{ band: BudgetBand; crore: number; label: string; description: string }> = [
  { band: "Low", crore: 0.75, label: "Low budget", description: "Survey, referral routing, mobile outreach, essential diagnostics, and stabilization basics." },
  { band: "Medium", crore: 4, label: "Medium budget", description: "Specialist clinics, HDU readiness, equipment upgrades, and district-level service expansion." },
  { band: "High", crore: 18, label: "High budget", description: "Full service line, advanced devices, ICU/NICU capacity, cath lab, or regional tertiary build-out." },
];

export const specialtyProfiles: SpecialtyPlanningProfile[] = [
  profile("Administration, Operations & Support Services", "Access operations", "Ambulance Services", "Trauma Care", 3, 2, 4, "Transport and operations can unlock access without building a full specialty unit."),
  profile("Anesthesia & Pain Medicine", "Surgical readiness", "Anesthesiology", "Trauma Care", 4, 3, 4, "Often the gating constraint for emergency surgery and safe district-level procedures."),
  profile("Emergency, Trauma & Critical Care", "Immediate stabilization", "Emergency Medicine", "Trauma Care", 5, 2, 5, "Low-to-mid cost stabilization capacity can reduce preventable death quickly."),
  profile("Emergency, Trauma & Critical Care", "Immediate stabilization", "Trauma Care", "Trauma Care", 5, 3, 5, "High life-criticality and strong lift where road travel delays are severe."),
  profile("Emergency, Trauma & Critical Care", "Critical beds", "Critical Care Medicine", "Trauma Care", 5, 4, 4, "Expensive but essential when high-risk zones lack monitored beds."),
  profile("Cardiology & Cardiothoracic", "Acute cardiac access", "Emergency Cardiology", "Emergency Cardiology", 5, 4, 4, "High mortality impact, but cath-lab and specialist costs require budget scrutiny."),
  profile("Cardiology & Cardiothoracic", "Acute cardiac access", "Interventional Cardiology", "Emergency Cardiology", 5, 5, 3, "Very expensive; prioritize only where volume and travel burden justify the lift."),
  profile("Cardiology & Cardiothoracic", "Prevention and follow-up", "Non Invasive Cardiology", "Emergency Cardiology", 3, 2, 4, "Lower cost screening and echo access can prevent avoidable transfers."),
  profile("Obstetrics, Gynecology & Fertility", "Maternal emergency", "Maternal ICU", "Maternal ICU", 5, 4, 5, "Life-threatening complications make this a high-priority desert signal."),
  profile("Obstetrics, Gynecology & Fertility", "Maternal emergency", "High Risk Pregnancy Care", "Maternal ICU", 5, 3, 5, "Strong lift from specialist triage, blood availability, and referral readiness."),
  profile("Obstetrics, Gynecology & Fertility", "Fertility and elective care", "IVF and Fertility", "Maternal ICU", 1, 4, 1, "Usually low life-criticality; expensive for limited desert-planning lift."),
  profile("Pediatrics & Neonatology", "Newborn survival", "Neonatal ICU", "Neonatal ICU", 5, 4, 5, "High life-criticality and strong lift in remote birth catchments."),
  profile("Pediatrics & Neonatology", "Child specialty care", "Pediatric Emergency Medicine", "Neonatal ICU", 5, 3, 4, "A practical middle path when full NICU build-out is not feasible."),
  profile("Oncology & Hematology", "Cancer treatment access", "Oncology Infusion", "Oncology Infusion", 4, 4, 3, "Important but costly; route and continuity of care matter as much as local beds."),
  profile("Oncology & Hematology", "Cancer treatment access", "Bone Marrow Transplant", "Oncology Infusion", 3, 5, 1, "High cost and low broad-population lift; usually regionalize."),
  profile("Diagnostics, Pathology & Laboratory", "Core diagnostics", "24 Hours Diagnostics", "Trauma Care", 4, 2, 5, "Often the best low-cost lift for many care pathways."),
  profile("Radiology, Imaging & Nuclear Medicine", "Imaging access", "Ultrasound and X-Ray", "Trauma Care", 4, 2, 5, "High lift at district level for maternity, trauma, and medical triage."),
  profile("Radiology, Imaging & Nuclear Medicine", "Advanced imaging", "MRI and CT", "Trauma Care", 3, 4, 3, "Useful but expensive; prioritize where referral bottlenecks are clear."),
  profile("Orthopedics, Spine & Sports Medicine", "Essential surgery", "Orthopedic Trauma", "Trauma Care", 4, 3, 4, "Good lift in accident-prone or remote districts."),
  profile("Dental, Oral & Maxillofacial", "Oral health", "General Dentistry", "Trauma Care", 2, 1, 3, "Low cost, but usually not life-threatening in desert prioritization."),
  profile("Dermatology, Plastic & Aesthetic", "Skin and reconstructive care", "Dermatology", "Trauma Care", 2, 2, 2, "Usually lower emergency priority unless burn or reconstructive access is the bottleneck."),
  profile("Endocrinology, Diabetes & Metabolic", "Chronic disease control", "Diabetes Management", "Emergency Cardiology", 3, 2, 4, "Strong lift from district-level screening and continuity, especially for cardiovascular prevention."),
  profile("General Medicine, Family & Internal Medicine", "Primary medical access", "Family Medicine", "Trauma Care", 4, 2, 5, "Often the highest practical lift for broad rural coverage."),
  profile("General, Laparoscopic & Minimal Access Surgery", "Essential surgery", "General Surgery", "Trauma Care", 4, 3, 4, "Important for district self-sufficiency when transfer times are high."),
  profile("Gastroenterology, Hepatobiliary & Colorectal", "Digestive and liver care", "Gastroenterology", "Trauma Care", 3, 4, 3, "Specialist-heavy and device-dependent; prioritize where liver, endoscopy, or emergency abdominal pathways create avoidable transfers."),
  profile("Genetics & Reproductive Genomics", "Specialized diagnostics", "Genetic Testing", "Oncology Infusion", 2, 4, 2, "Useful for specialized pathways, but usually not first-line desert investment."),
  profile("Geriatrics & Palliative Care", "Older adult and palliative care", "Palliative Care", "Trauma Care", 3, 2, 4, "Moderate-cost service that can reduce travel burden and improve continuity."),
  profile("Immunology, Allergy & Rheumatology", "Immune and rheumatology care", "Rheumatology", "Trauma Care", 2, 3, 2, "Often specialist-heavy with lower immediate mortality lift."),
  profile("Infectious Disease & Public Health", "Communicable disease response", "Tuberculosis and Infectious Disease", "Trauma Care", 4, 2, 5, "High population lift when surveillance, diagnostics, and treatment continuity are weak."),
  profile("Nutrition & Dietetics", "Nutrition access", "Dietetics and Nutrition", "Maternal ICU", 2, 1, 4, "Low cost and useful as a preventive layer, especially for maternal and child health."),
  profile("Ophthalmology", "Vision restoration", "Cataract Surgery", "Trauma Care", 2, 2, 4, "High quality-of-life lift but lower emergency priority."),
  profile("ENT, Head & Neck", "ENT access", "ENT / Otolaryngology", "Trauma Care", 2, 2, 3, "Moderate cost and lift; rarely first priority in life-threatening deserts."),
  profile("Urology, Nephrology & Transplant", "Renal access", "Dialysis", "Trauma Care", 5, 4, 4, "Life-sustaining but recurring-cost heavy; needs volume and transport planning."),
  profile("Mental Health & Behavioral", "Behavioral health", "Psychiatry", "Trauma Care", 3, 2, 4, "Strong access lift via hub-and-spoke or tele-psychiatry."),
  profile("Pulmonology & Respiratory", "Respiratory care", "Chest Medicine", "Trauma Care", 4, 2, 4, "High lift where asthma, TB, or respiratory failure pathways are weak."),
  profile("Rehabilitation, Physiotherapy & Allied Health", "Recovery and function", "Physiotherapy and Rehabilitation", "Trauma Care", 2, 1, 4, "Low-cost lift after trauma, stroke, and surgery, but lower acute mortality priority."),
  profile("Alternative & Integrative Medicine", "Traditional care", "Ayurveda", "Trauma Care", 1, 1, 2, "Low cost but low life-criticality for medical desert prioritization."),
  profile("Vascular & Endovascular", "Vascular intervention", "Vascular Surgery", "Trauma Care", 4, 4, 2, "High-cost specialist service; prioritize only with clear acute limb or trauma need."),
  profile("Other / Needs Review", "Unclassified", "Review Before Funding", "Trauma Care", 1, 1, 1, "Cleaned source values here need human classification before planning investment."),
];

export const categoryNames = Array.from(new Set(cleanedSpecialtyCatalog.map((entry) => entry.category))).sort();

export const cleanedCategoryCounts: Record<string, number> = {
  "Administration, Operations & Support Services": 14,
  "Alternative & Integrative Medicine": 31,
  "Anesthesia & Pain Medicine": 38,
  "Cardiology & Cardiothoracic": 98,
  "Dental, Oral & Maxillofacial": 281,
  "Dermatology, Plastic & Aesthetic": 101,
  "Diagnostics, Pathology & Laboratory": 95,
  "ENT, Head & Neck": 41,
  "Emergency, Trauma & Critical Care": 116,
  "Endocrinology, Diabetes & Metabolic": 47,
  "Gastroenterology, Hepatobiliary & Colorectal": 118,
  "General Medicine, Family & Internal Medicine": 67,
  "General, Laparoscopic & Minimal Access Surgery": 101,
  "Genetics & Reproductive Genomics": 9,
  "Geriatrics & Palliative Care": 9,
  "Immunology, Allergy & Rheumatology": 21,
  "Infectious Disease & Public Health": 16,
  "Invalid / Non-specialty": 4,
  "Mental Health & Behavioral": 36,
  "Neurology & Neurosurgery": 105,
  "Nutrition & Dietetics": 26,
  "Obstetrics, Gynecology & Fertility": 132,
  "Oncology & Hematology": 161,
  "Ophthalmology": 160,
  "Orthopedics, Spine & Sports Medicine": 156,
  "Other / Needs Review": 166,
  "Pediatrics & Neonatology": 192,
  "Pulmonology & Respiratory": 32,
  "Radiology, Imaging & Nuclear Medicine": 34,
  "Rehabilitation, Physiotherapy & Allied Health": 58,
  "Urology, Nephrology & Transplant": 86,
  "Vascular & Endovascular": 5,
};

export function profilesForCategory(category: string): SpecialtyPlanningProfile[] {
  return specialtyProfiles.filter((profile) => profile.category === category);
}

export function subcategoriesFor(category: string): string[] {
  return Array.from(new Set(cleanedSpecialtyCatalog.filter((entry) => entry.category === category).map((entry) => entry.subcategory))).sort();
}

export function specialtiesFor(category: string, subcategory: string): SpecialtyPlanningProfile[] {
  const defaultProfile = categoryDefaultProfile(category);
  return cleanedSpecialtyCatalog
    .filter((entry) => entry.category === category && entry.subcategory === subcategory)
    .map((entry) =>
      profile(
        entry.category,
        entry.subcategory,
        entry.specialty,
        defaultProfile.capability,
        defaultProfile.lifeCriticality,
        defaultProfile.costTier,
        defaultProfile.expectedLift,
        defaultProfile.rationale,
      ),
    )
    .sort((a, b) => a.specialty.localeCompare(b.specialty));
}

export function specialtiesForCategory(category: string): SpecialtyPlanningProfile[] {
  const defaultProfile = categoryDefaultProfile(category);
  return cleanedSpecialtyCatalog
    .filter((entry) => entry.category === category)
    .map((entry) =>
      profile(
        entry.category,
        entry.subcategory,
        entry.specialty,
        defaultProfile.capability,
        defaultProfile.lifeCriticality,
        defaultProfile.costTier,
        defaultProfile.expectedLift,
        defaultProfile.rationale,
      ),
    )
    .sort((a, b) => a.specialty.localeCompare(b.specialty));
}

export function getProfile(category: string, subcategory: string, specialty: string): SpecialtyPlanningProfile {
  return (
    specialtyProfiles.find((profile) => profile.category === category && profile.subcategory === subcategory && profile.specialty === specialty) ??
    {
      ...categoryDefaultProfile(category),
      category,
      subcategory,
      specialty,
    }
  );
}

export function getDefaultProfile(): SpecialtyPlanningProfile {
  return specialtyProfiles[0];
}

export function interventionForBudget(budgetCrore: number) {
  return interventionLevels.find((level) => budgetCrore >= level.minCrore && budgetCrore < level.maxCrore) ?? interventionLevels[0];
}

export function budgetBandInfo(band: BudgetBand) {
  return budgetBands.find((item) => item.band === band) ?? budgetBands[1];
}

export function budgetBandForCostTier(costTier: SpecialtyPlanningProfile["costTier"]): BudgetBand {
  if (costTier <= 2) return "Low";
  if (costTier === 3) return "Medium";
  return "High";
}

export function budgetInfoForProfile(profile: SpecialtyPlanningProfile) {
  return budgetBandInfo(budgetBandForCostTier(profile.costTier));
}

export function formatBudgetCrore(budgetCrore: number): string {
  if (budgetCrore < 1) return `₹${Math.round(budgetCrore * 100)}L`;
  return `₹${budgetCrore.toFixed(budgetCrore >= 10 ? 0 : 1)}Cr`;
}

export function budgetFit(profile: SpecialtyPlanningProfile, budgetCrore: number): "Affordable now" | "Stretch plan" | "Regionalize instead" {
  const capacity = interventionForBudget(budgetCrore).capacity;
  if (profile.costTier <= capacity) return "Affordable now";
  if (profile.costTier === capacity + 1) return "Stretch plan";
  return "Regionalize instead";
}

export function priorityScore(profile: SpecialtyPlanningProfile, riskScore: number, budgetCrore: number): number {
  const affordabilityPenalty = Math.max(0, profile.costTier - interventionForBudget(budgetCrore).capacity) * 10;
  const raw = riskScore * 0.42 + profile.lifeCriticality * 10 + profile.expectedLift * 9 - affordabilityPenalty;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function profile(
  category: string,
  subcategory: string,
  specialty: string,
  capability: SpecialtyPlanningProfile["capability"],
  lifeCriticality: SpecialtyPlanningProfile["lifeCriticality"],
  costTier: SpecialtyPlanningProfile["costTier"],
  expectedLift: SpecialtyPlanningProfile["expectedLift"],
  rationale: string,
): SpecialtyPlanningProfile {
  return { category, subcategory, specialty, capability, lifeCriticality, costTier, expectedLift, rationale };
}

function categoryDefaultProfile(category: string): SpecialtyPlanningProfile {
  return specialtyProfiles.find((profile) => profile.category === category) ?? specialtyProfiles[0];
}
