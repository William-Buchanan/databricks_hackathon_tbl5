import type { RegionAggregate } from "../types";

interface RiskMatrixProps {
  regions: RegionAggregate[];
  selectedId?: string;
  onSelect: (region: RegionAggregate) => void;
  onHover: (region: RegionAggregate) => void;
}

const quadrants = [
  { id: "verified", title: "Verified Care Desert", hint: "High risk, high trust", x: "right", y: "top" },
  { id: "data-poor", title: "Data-Poor Region", hint: "High risk, low trust", x: "right", y: "bottom" },
  { id: "monitored", title: "Monitored Access", hint: "Low risk, high trust", x: "left", y: "top" },
  { id: "audit", title: "Low Priority Audit", hint: "Low risk, low trust", x: "left", y: "bottom" },
];

export function RiskMatrix({ regions, selectedId, onSelect, onHover }: RiskMatrixProps) {
  return (
    <section className="matrix-panel" aria-label="Trust weighted risk matrix">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Risk matrix</p>
          <h2>Separate deserts from missing evidence.</h2>
        </div>
        <div className="matrix-header-tools">
          <div className="matrix-legend" aria-label="Matrix color legend">
            {quadrants.map((quadrant) => (
              <span key={quadrant.id}>
                <i className={statusClass(quadrant.title)} /> {quadrant.title}
              </span>
            ))}
          </div>
          <span className="source-badge">Mock India dataset</span>
        </div>
      </div>
      <div className="matrix">
        <span className="axis y-axis">Trust score</span>
        <span className="axis x-axis">Risk score</span>
        {quadrants.map((quadrant) => (
          <div key={quadrant.id} className={`quadrant ${quadrant.x} ${quadrant.y}`}>
            <strong>{quadrant.title}</strong>
            <span>{quadrant.hint}</span>
          </div>
        ))}
        {regions.map((region) => (
          <button
            key={region.id}
            type="button"
            className={`matrix-dot ${statusClass(region.status)} ${selectedId === region.id ? "selected" : ""}`}
            style={{ left: `${region.riskScore}%`, bottom: `${region.trustScore}%` }}
            onClick={() => onSelect(region)}
            onMouseEnter={() => onHover(region)}
          />
        ))}
      </div>
    </section>
  );
}

export function statusClass(status: string): string {
  if (status === "Verified Care Desert") return "status-desert";
  if (status === "Data-Poor Region") return "status-data-poor";
  if (status === "Monitored Access") return "status-monitored";
  return "status-audit";
}
