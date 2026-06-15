import { formatInrRange, hbpBenchmarkForProfile, HBP_RATE_LIST_LABEL } from "../data/hbpRateList";
import type { RegionAggregate, RouteSummary, SpecialtyPlanningProfile } from "../types";
import { statusClass } from "./RiskMatrix";

interface RegionContextCardProps {
  region?: RegionAggregate;
  routeSummary?: RouteSummary;
  planningProfile: SpecialtyPlanningProfile;
  isFlagged: boolean;
  onToggleFlag: (id: string) => void;
  onOpenHbpTable: () => void;
}

export function RegionContextCard({ region, routeSummary, planningProfile, isFlagged, onToggleFlag, onOpenHbpTable }: RegionContextCardProps) {
  const hbpBenchmark = hbpBenchmarkForProfile(planningProfile.category, planningProfile.specialty);

  if (!region) {
    return (
      <aside className="context-card empty-context">
        <p className="eyebrow">Region details</p>
        <h2>Hover a map point or matrix dot.</h2>
        <p>City, region, risk, trust, population, and travel burden will appear here.</p>
      </aside>
    );
  }

  return (
    <aside className="context-card">
      <div className="context-title">
        <span className={`status-dot ${statusClass(region.status)}`} />
        <div>
          <p className="eyebrow">Region details</p>
          <h2>{hospitalName(region)}</h2>
          <p>
            {region.subDistrict}, {region.district}, {region.state}
          </p>
        </div>
      </div>
      <div className="investment-card">
        <strong>Trust score</strong>
        <span>{region.trustScore}/100</span>
      </div>
      <div className="investment-card">
        <strong>GBD life-threatening score</strong>
        <span>{planningProfile.lifeCriticality}/5 for {planningProfile.specialty}</span>
        <small>
          {planningProfile.gbdEvidence.primaryCause} · {planningProfile.gbdEvidence.preferredMeasure}
        </small>
      </div>
      <div className="gbd-evidence-card">
        <strong>GBD evidence basis</strong>
        <div>
          <span>Mortality {planningProfile.gbdEvidence.mortalityRelevance}/5</span>
          <span>YLL (years of life lost) {planningProfile.gbdEvidence.yllRelevance}/5</span>
          <span>Emergency {planningProfile.gbdEvidence.emergencySensitivity}/5</span>
        </div>
        <p>{planningProfile.gbdEvidence.notes}</p>
        <a href={planningProfile.gbdEvidence.sourceUrl} target="_blank" rel="noreferrer">
          {planningProfile.gbdEvidence.sourceName}
        </a>
      </div>
      <div className="cost-benchmark-cell">
        <button className="cost-benchmark-link" type="button" onClick={onOpenHbpTable}>
          <strong>AB PM-JAY estimate</strong>
          <span>{formatInrRange(hbpBenchmark.low, hbpBenchmark.high)} INR package benchmark</span>
          <small>{HBP_RATE_LIST_LABEL}</small>
        </button>
      </div>
      <div className="route-summary">
        <strong>Fastest transport route</strong>
        {routeSummary ? (
          <>
            <span>{routeSummary.durationText} by driving</span>
            <small>
              To {routeSummary.destinationName} · {routeSummary.distanceText} · Google Maps route estimate
            </small>
            <a href={googleMapsRouteUrl(routeSummary.origin, region)} target="_blank" rel="noreferrer">
              Open route in Google Maps
            </a>
          </>
        ) : (
          <small>Click a starting point on the map to calculate the fastest Google Maps driving route to this region.</small>
        )}
      </div>
      <button type="button" className="primary-button" onClick={() => onToggleFlag(region.id)}>
        {isFlagged ? "Remove flag" : "Flag zone"}
      </button>
    </aside>
  );
}

function hospitalName(region: RegionAggregate): string {
  return region.facilities[0]?.facilityName ?? region.villageTown;
}

function googleMapsRouteUrl(origin: RouteSummary["origin"], destination: RegionAggregate): string {
  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.latitude},${origin.longitude}`,
    destination: `${destination.latitude},${destination.longitude}`,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
