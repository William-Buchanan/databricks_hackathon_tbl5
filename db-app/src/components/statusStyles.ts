export const STATUS_LEGEND_ITEMS = [
  { id: "verified", title: "Verified Care Desert", hint: "High risk, high trust" },
  { id: "data-poor", title: "Data-Poor Region", hint: "High risk, low trust" },
  { id: "monitored", title: "Monitored Access", hint: "Low risk, high trust" },
  { id: "audit", title: "Low Priority Audit", hint: "Low risk, low trust" },
];

export function statusClass(status: string): string {
  if (status === "Verified Care Desert") return "status-desert";
  if (status === "Data-Poor Region") return "status-data-poor";
  if (status === "Monitored Access") return "status-monitored";
  return "status-audit";
}
