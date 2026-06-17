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
  const h3Clusters = noHospitalH3DesertClusters(regions);
  const visibleClusters = h3Clusters.slice(0, MAX_VISIBLE_DESERTS);
  const othersPopulation = sourcePopulation(h3Clusters.slice(MAX_VISIBLE_DESERTS));
  const maxPopulation = Math.max(1, ...visibleClusters.map((cluster) => (hasSourcePopulation(cluster) ? cluster.population : 0)), othersPopulation);
  const totalPopulation = sourcePopulation(h3Clusters);

  return (
    <section className="largest-deserts-panel" aria-label="Largest medical deserts">
      <div className="panel-header compact">
        <div>
          <p className="eyebrow">Largest deserts</p>
          <h2>{visibleClusters.length ? "No-hospital H3 clusters" : "No no-hospital H3 clusters in scope"}</h2>
        </div>
        <span className="source-badge">Source population only</span>
      </div>

      <div className="desert-summary-strip">
        <span>
          <strong>{formatPopulation(h3Clusters.length)}</strong>
          desert clusters
        </span>
        <span>
          <strong>{formatPopulation(totalPopulation)}</strong>
          source population
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
                <i style={{ width: `${Math.max(8, ((hasSourcePopulation(cluster) ? cluster.population : 0) / maxPopulation) * 100)}%` }} />
              </span>
              <span className="desert-rank-value">
                <strong>{formatClusterPopulation(cluster)}</strong>
                <small>{hasSourcePopulation(cluster) ? "source population" : "population unavailable"}</small>
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
                <small>source population</small>
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state compact-empty">
          <h2>No source-backed no-hospital H3 clusters match the current filters.</h2>
          <p>The app will not invent city populations for H3 cells that do not have population data.</p>
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
  populationSource: RegionAggregate["populationSource"];
  averageRisk: number;
  capableFacilityCount: number;
  facilityCount: number;
  sourceH3HospitalCount: number;
}

function noHospitalH3DesertClusters(regions: RegionAggregate[]): H3DesertCluster[] {
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
      const sourceH3HospitalCount = clusterRegions.reduce((sum, region) => sum + sourceH3HospitalCountForRegion(region), 0);
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
        populationSource: aggregateClusterPopulationSource(clusterRegions),
        averageRisk,
        capableFacilityCount,
        facilityCount,
        sourceH3HospitalCount,
      };
    })
    .filter((cluster) => {
      const capableCoverage = hasSourcePopulation(cluster) ? cluster.capableFacilityCount / Math.max(1, cluster.population / 100000) : 0;
      return cluster.sourceH3HospitalCount === 0 && cluster.averageRisk < 64 && capableCoverage < 1.25;
    })
    .slice()
    .sort((a, b) => Number(hasSourcePopulation(b)) - Number(hasSourcePopulation(a)) || b.population - a.population || a.facilityCount - b.facilityCount || b.averageRisk - a.averageRisk);
}

function h3ClusterId(region: RegionAggregate): string {
  const rawH3 = region.facilities.find((facility) => facility.h3Index7 && isValidCell(facility.h3Index7))?.h3Index7;
  return rawH3 ? cellToParent(rawH3, H3_CLUSTER_RESOLUTION) : latLngToCell(region.latitude, region.longitude, H3_CLUSTER_RESOLUTION);
}

function clusterLabel(id: string, region: RegionAggregate): string {
  return region.villageTown;
}

function sourceH3HospitalCountForRegion(region: RegionAggregate): number {
  if (region.h3DensityMetrics) return region.h3DensityMetrics.uniqueHospitalCount;
  return region.facilities.filter((facility) => facility.h3Index7 && isValidCell(facility.h3Index7)).length;
}

function aggregateClusterPopulationSource(regions: RegionAggregate[]): RegionAggregate["populationSource"] {
  const sources = new Set(regions.map((region) => region.populationSource));
  if (sources.size === 1) return sources.values().next().value as RegionAggregate["populationSource"];
  if (sources.has("source") || sources.has("mixed")) return "mixed";
  if (sources.has("synthetic")) return "synthetic";
  return "unavailable";
}

function hasSourcePopulation(cluster: Pick<H3DesertCluster, "population" | "populationSource">): boolean {
  return cluster.population > 0 && (cluster.populationSource === "source" || cluster.populationSource === "mixed");
}

function sourcePopulation(clusters: H3DesertCluster[]): number {
  return clusters.reduce((sum, cluster) => sum + (hasSourcePopulation(cluster) ? cluster.population : 0), 0);
}

function formatClusterPopulation(cluster: H3DesertCluster): string {
  return hasSourcePopulation(cluster) ? formatPopulation(cluster.population) : "Unavailable";
}

function formatPopulation(value: number): string {
  return value.toLocaleString("en-US");
}
