import { MapPin, Users } from "lucide-react";
import type { RegionAggregate } from "../types";
import { statusClass } from "./RiskMatrix";

interface LargestDesertsPanelProps {
  regions: RegionAggregate[];
  selectedId?: string;
  onSelect: (region: RegionAggregate) => void;
  onHover: (region: RegionAggregate) => void;
}

const MAX_VISIBLE_DESERTS = 5;

export function LargestDesertsPanel({ regions, selectedId, onSelect, onHover }: LargestDesertsPanelProps) {
  const verifiedDeserts = regions.filter((region) => region.status === "Verified Care Desert");
  const desertRegions = (verifiedDeserts.length ? verifiedDeserts : regions.filter((region) => region.riskScore >= 62))
    .slice()
    .sort((a, b) => b.population - a.population || b.riskScore - a.riskScore);
  const visibleDeserts = desertRegions.slice(0, MAX_VISIBLE_DESERTS);
  const othersPopulation = desertRegions.slice(MAX_VISIBLE_DESERTS).reduce((sum, region) => sum + region.population, 0);
  const maxPopulation = Math.max(1, ...visibleDeserts.map((region) => region.population), othersPopulation);
  const totalPopulation = desertRegions.reduce((sum, region) => sum + region.population, 0);

  return (
    <section className="largest-deserts-panel" aria-label="Largest medical deserts">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Largest deserts</p>
          <h2>{visibleDeserts.length ? "Largest care desert clusters" : "No deserts in scope"}</h2>
        </div>
        <span className="source-badge">{verifiedDeserts.length ? "Verified" : "Risk threshold"}</span>
      </div>

      <div className="desert-summary-strip">
        <span>
          <strong>{desertRegions.length.toLocaleString("en-IN")}</strong>
          clusters
        </span>
        <span>
          <strong>{totalPopulation.toLocaleString("en-IN")}</strong>
          population
        </span>
      </div>

      {visibleDeserts.length ? (
        <div className="desert-ranking">
          {visibleDeserts.map((region) => (
            <button
              key={region.id}
              type="button"
              className={`desert-rank-row ${selectedId === region.id ? "selected" : ""}`}
              onClick={() => onSelect(region)}
              onMouseEnter={() => onHover(region)}
            >
              <span className={`status-dot ${statusClass(region.status)}`} />
              <span className="desert-rank-main">
                <strong>{region.villageTown}</strong>
                <small>
                  <MapPin size={13} /> {region.district}, {region.state}
                </small>
                <i style={{ width: `${Math.max(8, (region.population / maxPopulation) * 100)}%` }} />
              </span>
              <span className="desert-rank-value">{region.population.toLocaleString("en-IN")}</span>
            </button>
          ))}
          {othersPopulation > 0 && (
            <div className="desert-rank-row desert-others">
              <span />
              <span className="desert-rank-main">
                <strong>Others</strong>
                <small>
                  <Users size={13} /> {desertRegions.length - MAX_VISIBLE_DESERTS} additional clusters
                </small>
                <i style={{ width: `${Math.max(8, (othersPopulation / maxPopulation) * 100)}%` }} />
              </span>
              <span className="desert-rank-value">{othersPopulation.toLocaleString("en-IN")}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state compact-empty">
          <h2>No verified medical deserts match the current filters.</h2>
          <p>Adjust specialty or geography to expand the scope.</p>
        </div>
      )}
    </section>
  );
}
