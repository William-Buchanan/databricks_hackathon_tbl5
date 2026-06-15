import { MapPin, Navigation } from "lucide-react";
import type { RegionAggregate } from "../types";
import { statusClass } from "./RiskMatrix";

interface RegionListProps {
  regions: RegionAggregate[];
  selectedId?: string;
  onSelect: (region: RegionAggregate) => void;
  onHover?: (region: RegionAggregate) => void;
  flaggedIds: string[];
  onToggleFlag: (id: string) => void;
}

export function RegionList({ regions, selectedId, onSelect, onHover, flaggedIds, onToggleFlag }: RegionListProps) {
  return (
    <section className="region-panel">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Aggregate zones</p>
          <h2>{regions.length} zones in scope</h2>
        </div>
      </div>
      <div className="region-list">
        {regions.map((region) => (
          <article key={region.id} className={`region-row ${selectedId === region.id ? "selected" : ""}`} onMouseEnter={() => onHover?.(region)}>
            <button type="button" className="region-main" onClick={() => onSelect(region)}>
              <span className={`status-dot ${statusClass(region.status)}`} />
              <span>
                <strong>{region.villageTown}</strong>
                <small>
                  <MapPin size={13} /> {region.district}, {region.state} - {region.pinCode}
                </small>
              </span>
            </button>
            <div className="region-metrics">
              <span>Risk {region.riskScore}</span>
              <span>Trust {region.trustScore}</span>
              <span>
                <Navigation size={13} /> {region.nearestTertiaryMinutes}m
              </span>
            </div>
            <button type="button" className="ghost-button mini" onClick={() => onToggleFlag(region.id)}>
              {flaggedIds.includes(region.id) ? "Flagged" : "Flag"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
