import { Building2, Clock, ExternalLink, Facebook, HeartPulse, MapPin, ShieldCheck } from "lucide-react";
import { facebookHospitalCards } from "../data/facebookHospitalCards";
import type { FacilityRecord, RegionAggregate, SpecialtyPlanningProfile } from "../types";
import { statusClass } from "./RiskMatrix";

interface ExploreCardsProps {
  facilities: FacilityRecord[];
  regions: RegionAggregate[];
  selectedId?: string;
  planningProfile: SpecialtyPlanningProfile;
  onSelect: (region: RegionAggregate) => void;
  onHover: (region: RegionAggregate) => void;
}

export function ExploreCards({ facilities, regions, selectedId, planningProfile, onSelect, onHover }: ExploreCardsProps) {
  const regionByPlace = new Map(regions.map((region) => [regionKey(region), region]));
  const cards = facilities
    .map((facility) => ({ facility, region: regionByPlace.get(regionKey(facility)) }))
    .filter((item): item is { facility: FacilityRecord; region: RegionAggregate } => Boolean(item.region))
    .slice(0, 24);

  return (
    <section className="explore-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Explore</p>
          <h2>Hospital opportunities</h2>
        </div>
        <span className="source-badge">{cards.length} visible records</span>
      </div>
      <div className="opportunity-grid">
        {cards.map(({ facility, region }, index) => {
          const sourceCard = facebookHospitalCards[index % facebookHospitalCards.length];
          return (
            <article
              key={facility.id}
              className={`opportunity-card ${selectedId === region.id ? "selected" : ""}`}
              onMouseEnter={() => onHover(region)}
            >
              <button type="button" className="opportunity-image" onClick={() => onSelect(region)} aria-label={`Open ${sourceCard.hospitalName}`}>
                <span className={`status-dot ${statusClass(region.status)}`} />
                <strong>{index % 3 === 0 ? "Care gap" : index % 3 === 1 ? "Capacity lift" : "Audit lead"}</strong>
                <small>{region.status}</small>
              </button>
              <div className="opportunity-body">
                <button type="button" onClick={() => onSelect(region)}>
                  <h3>{sourceCard.hospitalName}</h3>
                </button>
              <p>
                <MapPin size={14} /> {facility.villageTown}, {facility.district}, {facility.state}
              </p>
              <div className="opportunity-metrics">
                <span>
                  <HeartPulse size={14} /> Risk {region.riskScore}
                </span>
                <span>
                  <ShieldCheck size={14} /> Trust {region.trustScore}
                </span>
                <span>
                  <Clock size={14} /> {region.nearestTertiaryMinutes}m
                </span>
                <span>
                  <Building2 size={14} /> {region.capableFacilityCount}/{region.facilityCount}
                </span>
              </div>
              <div className="capability-chips">
                <span>{planningProfile.category}</span>
                <span>Life-critical {planningProfile.lifeCriticality}/5</span>
              </div>
              <a className="facebook-card-link" href={sourceCard.facebookLink} target="_blank" rel="noreferrer">
                <Facebook size={15} /> Facebook profile <ExternalLink size={13} />
              </a>
            </div>
          </article>
          );
        })}
      </div>
    </section>
  );
}

function regionKey(record: Pick<FacilityRecord | RegionAggregate, "state" | "district" | "subDistrict" | "pinCode" | "villageTown">) {
  return `${record.state}|${record.district}|${record.subDistrict}|${record.pinCode}|${record.villageTown}`;
}
