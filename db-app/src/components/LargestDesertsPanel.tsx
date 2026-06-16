import { cellToParent, isValidCell, latLngToCell } from "h3-js";
import { MapPin, Users } from "lucide-react";
import type { RegionAggregate } from "../types";
import { statusClass } from "./statusStyles";

interface LargestDesertsPanelProps {
  regions: RegionAggregate[];
  selectedId?: string;
  onSelect: (region: RegionAggregate) => void;
  onHover: (region: RegionAggregate) => void;
}

const MAX_VISIBLE_DESERTS = 15;
const H3_CLUSTER_RESOLUTION = 4;

export function LargestDesertsPanel({ regions, selectedId, onSelect, onHover }: LargestDesertsPanelProps) {
  const h3Clusters = lightH3DesertClusters(regions);
  const visibleClusters = h3Clusters.slice(0, MAX_VISIBLE_DESERTS);
  const othersPopulation = h3Clusters.slice(MAX_VISIBLE_DESERTS).reduce((sum, cluster) => sum + cluster.population, 0);
  const maxPopulation = Math.max(1, ...visibleClusters.map((cluster) => cluster.population), othersPopulation);
  const totalPopulation = h3Clusters.reduce((sum, cluster) => sum + cluster.population, 0);

  return (
    <section className="largest-deserts-panel" aria-label="Largest medical deserts">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Largest deserts</p>
          <h2>{visibleClusters.length ? "Largest desert clusters" : "No desert clusters in scope"}</h2>
        </div>
        <span className="source-badge">Estimated people</span>
      </div>

      <div className="desert-summary-strip">
        <span>
          <strong>{formatPopulation(h3Clusters.length)}</strong>
          desert clusters
        </span>
        <span>
          <strong>{formatPopulation(totalPopulation)}</strong>
          estimated people
        </span>
      </div>

      {visibleClusters.length ? (
        <div className="desert-ranking">
          {visibleClusters.map((cluster) => (
            <button
              key={cluster.id}
              type="button"
              className={`desert-rank-row ${selectedId && cluster.regions.some((region) => region.id === selectedId) ? "selected" : ""}`}
              onClick={() => onSelect(cluster.topRegion)}
              onMouseEnter={() => onHover(cluster.topRegion)}
            >
              <span className={`status-dot ${statusClass(cluster.topRegion.status)}`} />
              <span className="desert-rank-main">
                <strong>{cluster.label}</strong>
                <small>
                  <MapPin size={13} /> {cluster.districts.join(", ")}
                </small>
                <i style={{ width: `${Math.max(8, (cluster.population / maxPopulation) * 100)}%` }} />
              </span>
              <span className="desert-rank-value">
                <strong>{formatPopulation(cluster.population)}</strong>
                <small>est. people</small>
              </span>
            </button>
          ))}
          {othersPopulation > 0 && (
            <div className="desert-rank-row desert-others">
              <span />
              <span className="desert-rank-main">
                <strong>Others</strong>
                <small>
                  <Users size={13} /> {h3Clusters.length - MAX_VISIBLE_DESERTS} additional desert clusters
                </small>
                <i style={{ width: `${Math.max(8, (othersPopulation / maxPopulation) * 100)}%` }} />
              </span>
              <span className="desert-rank-value">
                <strong>{formatPopulation(othersPopulation)}</strong>
                <small>est. people</small>
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state compact-empty">
          <h2>No large sparse desert clusters match the current filters.</h2>
          <p>Adjust specialty or geography to expand the scope.</p>
        </div>
      )}
    </section>
  );
}

interface H3DesertCluster {
  id: string;
  label: string;
  regions: RegionAggregate[];
  topRegion: RegionAggregate;
  districts: string[];
  population: number;
  averageRisk: number;
  capableFacilityCount: number;
  facilityCount: number;
}

function lightH3DesertClusters(regions: RegionAggregate[]): H3DesertCluster[] {
  const groups = new Map<string, RegionAggregate[]>();

  regions.forEach((region) => {
    const id = h3ClusterId(region);
    const current = groups.get(id) ?? [];
    current.push(region);
    groups.set(id, current);
  });

  return Array.from(groups.entries())
    .map(([id, clusterRegions]) => {
      const population = clusterRegions.reduce((sum, region) => sum + region.population, 0);
      const capableFacilityCount = clusterRegions.reduce((sum, region) => sum + region.capableFacilityCount, 0);
      const facilityCount = clusterRegions.reduce((sum, region) => sum + region.facilityCount, 0);
      const averageRisk = Math.round(clusterRegions.reduce((sum, region) => sum + region.riskScore, 0) / clusterRegions.length);
      const topRegion = [...clusterRegions].sort((a, b) => b.riskScore - a.riskScore || a.trustScore - b.trustScore)[0];
      const districts = Array.from(new Set(clusterRegions.map((region) => region.district))).sort((a, b) => a.localeCompare(b)).slice(0, 3);
      return {
        id,
        label: clusterLabel(id, topRegion),
        regions: clusterRegions,
        topRegion,
        districts,
        population,
        averageRisk,
        capableFacilityCount,
        facilityCount,
      };
    })
    .filter((cluster) => {
      const capableCoverage = cluster.capableFacilityCount / Math.max(1, cluster.population / 100000);
      const hospitalCoverage = cluster.facilityCount / Math.max(1, cluster.population / 100000);
      return cluster.averageRisk < 64 && capableCoverage < 1.25 && hospitalCoverage < 4;
    })
    .slice()
    .sort((a, b) => b.population - a.population || a.facilityCount - b.facilityCount || b.averageRisk - a.averageRisk);
}

function h3ClusterId(region: RegionAggregate): string {
  const rawH3 = region.facilities.find((facility) => facility.h3Index7 && isValidCell(facility.h3Index7))?.h3Index7;
  return rawH3 ? cellToParent(rawH3, H3_CLUSTER_RESOLUTION) : latLngToCell(region.latitude, region.longitude, H3_CLUSTER_RESOLUTION);
}

function clusterLabel(id: string, region: RegionAggregate): string {
  return region.villageTown;
}

function formatPopulation(value: number): string {
  return value.toLocaleString("en-US");
}
