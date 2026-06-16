import type { Capability, FacilityRecord } from "../types";

const capabilities: Capability[] = [
  "Emergency Cardiology",
  "Maternal ICU",
  "Trauma Care",
  "Neonatal ICU",
  "Oncology Infusion",
];

const templates = [
  {
    state: "Maharashtra",
    district: "Nandurbar",
    subDistricts: [
      { name: "Akkalkuwa", center: [21.55, 74.02], pins: ["425415", "425414"], villages: ["Khadki", "Molgi", "Dab"] },
      { name: "Shahada", center: [21.55, 74.47], pins: ["425409", "425423"], villages: ["Lonkheda", "Prakasha", "Kukdel"] },
    ],
  },
  {
    state: "Maharashtra",
    district: "Gadchiroli",
    subDistricts: [
      { name: "Etapalli", center: [19.68, 80.43], pins: ["442704", "442705"], villages: ["Gatta", "Todgatta", "Hedri"] },
      { name: "Aheri", center: [19.41, 80.00], pins: ["442705", "442709"], villages: ["Alapalli", "Nagaram", "Khamancheru"] },
    ],
  },
  {
    state: "Rajasthan",
    district: "Barmer",
    subDistricts: [
      { name: "Chohtan", center: [25.34, 71.02], pins: ["344702", "344706"], villages: ["Dhorimana", "Sedwa", "Bachhrau"] },
      { name: "Baytoo", center: [25.83, 71.86], pins: ["344034", "344035"], villages: ["Kawas", "Gida", "Baitu Bhopji"] },
    ],
  },
  {
    state: "Rajasthan",
    district: "Jaisalmer",
    subDistricts: [
      { name: "Pokhran", center: [26.92, 71.92], pins: ["345021", "345024"], villages: ["Lathi", "Ramdevra", "Chandan"] },
      { name: "Fatehgarh", center: [27.43, 70.46], pins: ["345027", "345001"], villages: ["Salkha", "Devikot", "Kanoi"] },
    ],
  },
  {
    state: "Karnataka",
    district: "Raichur",
    subDistricts: [
      { name: "Manvi", center: [15.99, 77.05], pins: ["584123", "584120"], villages: ["Kallur", "Hirekotnekal", "Sirwar"] },
      { name: "Sindhanur", center: [15.77, 76.76], pins: ["584128", "584132"], villages: ["Turvihal", "Roudkunda", "Gorebal"] },
    ],
  },
  {
    state: "Karnataka",
    district: "Kalaburagi",
    subDistricts: [
      { name: "Chincholi", center: [17.47, 77.43], pins: ["585305", "585307"], villages: ["Kodli", "Sulepeth", "Ratkal"] },
      { name: "Aland", center: [17.57, 76.57], pins: ["585302", "585314"], villages: ["Nimbarga", "Kadaganchi", "Narona"] },
    ],
  },
];

function pickCaps(seed: number): Capability[] {
  const primary = capabilities[seed % capabilities.length];
  const secondary = capabilities[(seed + 2) % capabilities.length];
  return seed % 5 === 0 ? [primary, secondary] : [primary];
}

function bedsFor(caps: Capability[], seed: number): Partial<Record<Capability, number>> {
  return caps.reduce<Partial<Record<Capability, number>>>((acc, cap, index) => {
    acc[cap] = seed % 7 === 0 ? 0 : Math.max(1, ((seed + index) % 5) + (seed % 3));
    return acc;
  }, {});
}

export function generateHealthcareDataset(): FacilityRecord[] {
  const rows: FacilityRecord[] = [];
  let seed = 1;

  for (const region of templates) {
    for (const sub of region.subDistricts) {
      sub.villages.forEach((village, villageIndex) => {
        sub.pins.forEach((pin, pinIndex) => {
          const sparse = seed % 6 === 0 || region.district === "Jaisalmer";
          const lat = sub.center[0] + (villageIndex - 1) * 0.055 + pinIndex * 0.018;
          const lng = sub.center[1] + (pinIndex - 0.5) * 0.07 + villageIndex * 0.012;
          const caps = sparse ? pickCaps(seed).filter((_, i) => i === 0 && seed % 2 === 0) : pickCaps(seed);
          const population = 12000 + ((seed * 7919) % 78000) + (sparse ? 30000 : 0);

          rows.push({
            id: `fac-${seed}`,
            state: region.state,
            district: region.district,
            subDistrict: sub.name,
            pinCode: pin,
            villageTown: village,
            localPopulation: population,
            facilityName: `${village} ${seed % 3 === 0 ? "Rural Referral Centre" : seed % 2 === 0 ? "Community Health Unit" : "General Hospital"}`,
            latitude: Number(lat.toFixed(5)),
            longitude: Number(lng.toFixed(5)),
            capabilities: caps,
            specializedBeds: bedsFor(caps, seed),
            operationalStatus: seed % 11 === 0 ? "Unknown" : seed % 7 === 0 ? "Limited" : seed % 13 === 0 ? "Closed" : "Operational",
            dataCompleteness: {
              updatedDaysAgo: sparse ? 130 + (seed % 80) : 8 + (seed % 45),
              missingOperationalFields: sparse ? 3 + (seed % 3) : seed % 2,
              sourceConfidence: sparse ? 0.45 + (seed % 10) / 100 : 0.78 + (seed % 18) / 100,
              hasRecentSurvey: !sparse && seed % 8 !== 0,
            },
            distanceToTertiaryMinutes: sparse ? 135 + (seed % 80) : 42 + (seed % 90),
          });
          seed += 1;
        });
      });
    }
  }

  return rows;
}
