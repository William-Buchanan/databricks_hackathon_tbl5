import { Activity, Building2, DatabaseZap, Gauge, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import type { Capability, RegionAggregate } from "../types";
import { statusClass } from "./statusStyles";

interface InspectionPanelProps {
  region?: RegionAggregate;
  capability: Capability;
}

export function InspectionPanel({ region, capability }: InspectionPanelProps) {
  if (!region) {
    return (
      <section className="inspection-panel empty-state">
        <p className="eyebrow">Detailed inspection</p>
        <h2>Select a high-risk aggregate zone.</h2>
        <p>Hover or click a map marker or zone row to inspect facilities and population catchments.</p>
      </section>
    );
  }

  return (
    <section className="inspection-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Detailed inspection</p>
          <h2>{region.villageTown}</h2>
          <p className="muted">
            {region.subDistrict}, {region.district}, {region.state} - {region.pinCode}
          </p>
        </div>
        <span className={`status-pill ${statusClass(region.status)}`}>{region.status}</span>
      </div>
      <div className="metric-grid">
        <Metric icon={<UsersRound size={16} />} label="Local population" value={region.population.toLocaleString("en-IN")} />
        <Metric icon={<Activity size={16} />} label={`${capability} beds`} value={String(region.capableBeds)} />
        <Metric icon={<Building2 size={16} />} label="Facilities" value={`${region.capableFacilityCount}/${region.facilityCount}`} />
        <Metric icon={<DatabaseZap size={16} />} label="Trust / Risk" value={`${region.trustScore} / ${region.riskScore}`} />
        {region.h3DensityMetrics && (
          <>
            <Metric icon={<Gauge size={16} />} label="H3 population density" value={`${Math.round(region.h3DensityMetrics.populationDensityPerKm2).toLocaleString("en-IN")}/km2`} />
            <Metric icon={<Building2 size={16} />} label="H3 hospital count" value={String(region.h3DensityMetrics.uniqueHospitalCount)} />
          </>
        )}
      </div>
      {region.h3DensityMetrics && (
        <div className="density-evidence">
          <strong>H3 density evidence</strong>
          <span>{region.h3DensityMetrics.h3Index7}</span>
          <small>
            Hospital-to-density ratio {formatRatio(region.h3DensityMetrics.hospitalToPopulationDensityRatio)} · normalized {region.h3DensityMetrics.normalizedHospPopRatio.toFixed(3)}
          </small>
        </div>
      )}
      <div className="facility-table">
        <div className="table-head">
          <span>Facility</span>
          <span>Status</span>
          <span>Capabilities</span>
          <span>Data log</span>
        </div>
        {region.facilities.map((facility) => (
          <div className="table-row" key={facility.id}>
            <span>
              <strong>{facility.facilityName}</strong>
              <small>
                {facility.latitude}, {facility.longitude}
              </small>
            </span>
            <span>{facility.operationalStatus}</span>
            <span>{facility.capabilities.length ? facility.capabilities.join(", ") : "No specialist capability recorded"}</span>
            <span>
              {facility.dataCompleteness.updatedDaysAgo}d old, {facility.dataCompleteness.missingOperationalFields} missing fields
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="metric-card">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function formatRatio(value: number): string {
  if (!Number.isFinite(value)) return "unavailable";
  if (value === 0) return "0";
  return value < 0.01 ? value.toExponential(2) : value.toFixed(3);
}
