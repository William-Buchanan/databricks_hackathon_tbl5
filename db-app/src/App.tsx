import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, Flag, Globe2, Grid2X2, X } from "lucide-react";
import { AskAiPanel } from "./components/AskAiPanel";
import { ExploreCards } from "./components/ExploreCards";
import { HbpRateModal } from "./components/HbpRateModal";
import { InspectionPanel } from "./components/InspectionPanel";
import { LargestDesertsPanel } from "./components/LargestDesertsPanel";
import { PlannerSearchBar } from "./components/PlannerSearchBar";
import { PlannerMap } from "./components/PlannerMap";
import { RegionFilters } from "./components/RegionFilters";
import { RegionList } from "./components/RegionList";
import { RiskMatrix } from "./components/RiskMatrix";
import { RegionContextCard } from "./components/RegionContextCard";
import { ScenarioSidebar } from "./components/ScenarioSidebar";
import { SpecialtyPlanningControls } from "./components/SpecialtyPlanningControls";
import { StatusLegend } from "./components/StatusLegend";
import { costTierForProfile, hbpBenchmarkForProfile } from "./data/hbpRateList";
import { generateHealthcareDataset } from "./data/mockHealthcare";
import { budgetInfoForProfile, getDefaultProfile, getProfile } from "./data/specialtyPlanning";
import { logPlannerEvent } from "./lib/auditLog";
import { ALL_VALUE, aggregateRegions, applyFilters, uniqueSorted } from "./lib/scoring";
import type { FacilityRecord, Filters, PlanningScenario, RegionAggregate, RouteSummary } from "./types";

const defaultProfile = getDefaultProfile();
const initialFilters: Filters = {
  capability: defaultProfile.capability,
  specialtyCategory: defaultProfile.category,
  specialtySubcategory: defaultProfile.subcategory,
  specialty: defaultProfile.specialty,
  budgetBand: budgetInfoForProfile(defaultProfile).band,
  budgetCrore: budgetInfoForProfile(defaultProfile).crore,
  keyword: "",
  state: ALL_VALUE,
  district: ALL_VALUE,
  subDistrict: ALL_VALUE,
  pinCode: ALL_VALUE,
};

type PlannerTab = "zones" | "deserts" | "matrix" | "details" | "scenarios";
type PlannerMode = "explore" | "globe";

export default function App() {
  const fallbackDataset = useMemo(() => generateHealthcareDataset(), []);
  const [dataset, setDataset] = useState<FacilityRecord[]>(fallbackDataset);
  const [datasetSource, setDatasetSource] = useState("mock");
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [selectedRegionId, setSelectedRegionId] = useState<string | undefined>();
  const [hoveredRegionId, setHoveredRegionId] = useState<string | undefined>();
  const [flaggedIds, setFlaggedIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [scenarios, setScenarios] = useState<PlanningScenario[]>([]);
  const [showRouting, setShowRouting] = useState(true);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | undefined>();
  const [activeTab, setActiveTab] = useState<PlannerTab>("zones");
  const [activeMode, setActiveMode] = useState<PlannerMode>("globe");
  const [showAskAi, setShowAskAi] = useState(false);
  const [showFlags, setShowFlags] = useState(false);
  const [showHbpTable, setShowHbpTable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/facilities")
      .then((response) => response.json())
      .then((data: { records?: FacilityRecord[]; source?: string; error?: string }) => {
        if (cancelled) return;
        if (data.records?.length) {
          setDataset(data.records);
          setDatasetSource(data.source ?? "workspace.gold.facilities_with_confidence_score");
          logPlannerEvent({
            eventType: "facility_dataset_loaded",
            payload: {
              source: data.source,
              recordCount: data.records.length,
            },
          });
          return;
        }
        setDatasetSource(`mock fallback${data.error ? `: ${data.error}` : ""}`);
      })
      .catch((error: Error) => {
        if (!cancelled) setDatasetSource(`mock fallback: ${error.message}`);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const scopedRecords = useMemo(() => applyKeyword(applyFilters(dataset, filters), filters.keyword), [dataset, filters]);
  const regions = useMemo(() => aggregateRegions(scopedRecords, filters.capability), [scopedRecords, filters.capability]);
  const planningProfile = useMemo(() => {
    const baseProfile = getProfile(filters.specialtyCategory, filters.specialtySubcategory, filters.specialty);
    const benchmark = hbpBenchmarkForProfile(baseProfile.category, baseProfile.specialty);
    return {
      ...baseProfile,
      costTier: Math.max(baseProfile.costTier, costTierForProfile(baseProfile.category, baseProfile.specialty, benchmark)) as typeof baseProfile.costTier,
    };
  }, [filters.specialtyCategory, filters.specialtySubcategory, filters.specialty]);
  const derivedBudget = useMemo(() => budgetInfoForProfile(planningProfile), [planningProfile]);
  const effectiveFilters = useMemo(
    () => ({ ...filters, budgetBand: derivedBudget.band, budgetCrore: derivedBudget.crore }),
    [filters, derivedBudget],
  );
  const selectedRegion = useMemo(
    () => regions.find((region) => region.id === selectedRegionId) ?? regions[0],
    [regions, selectedRegionId],
  );
  const contextRegion = useMemo(
    () => regions.find((region) => region.id === hoveredRegionId) ?? selectedRegion,
    [regions, hoveredRegionId, selectedRegion],
  );

  const options = useMemo(() => {
    const stateRecords = filters.state === ALL_VALUE ? dataset : dataset.filter((record) => record.state === filters.state);
    const districtRecords = filters.district === ALL_VALUE ? stateRecords : stateRecords.filter((record) => record.district === filters.district);
    const subDistrictRecords = filters.subDistrict === ALL_VALUE ? districtRecords : districtRecords.filter((record) => record.subDistrict === filters.subDistrict);
    return {
      states: uniqueSorted(dataset.map((record) => record.state)),
      districts: uniqueSorted(stateRecords.map((record) => record.district)),
      subDistricts: uniqueSorted(districtRecords.map((record) => record.subDistrict)),
      pinCodes: uniqueSorted(subDistrictRecords.map((record) => record.pinCode)),
    };
  }, [dataset, filters.state, filters.district, filters.subDistrict]);

  const flaggedRegions = useMemo(() => flaggedIds.map((id) => regions.find((region) => region.id === id)).filter((region): region is RegionAggregate => Boolean(region)), [flaggedIds, regions]);

  const selectRegion = useCallback((region: RegionAggregate) => {
    setSelectedRegionId(region.id);
    setHoveredRegionId(region.id);
    setRouteSummary(undefined);
    logPlannerEvent({
      eventType: "region_selected",
      payload: {
        region: regionLogPayload(region),
        filters: effectiveFilters,
        planningProfile: profileLogPayload(planningProfile),
      },
    });
  }, [effectiveFilters, planningProfile]);

  const scopeToRegion = useCallback((region: RegionAggregate) => {
    const nextFilters: Filters = {
      ...effectiveFilters,
      state: region.state,
      district: region.district,
      subDistrict: region.subDistrict,
      pinCode: region.pinCode,
    };
    setFilters(nextFilters);
    setSelectedRegionId(region.id);
    setHoveredRegionId(region.id);
    setRouteSummary(undefined);
    setActiveTab("zones");
    logPlannerEvent({
      eventType: "h3_region_scoped",
      payload: {
        region: regionLogPayload(region),
        previous: effectiveFilters,
        next: nextFilters,
        planningProfile: profileLogPayload(planningProfile),
      },
    });
  }, [effectiveFilters, planningProfile]);

  const openFlaggedRegion = useCallback((region: RegionAggregate) => {
    selectRegion(region);
    setActiveMode("globe");
    setActiveTab("zones");
    setShowFlags(false);
    logPlannerEvent({
      eventType: "flagged_region_opened",
      payload: {
        region: regionLogPayload(region),
        filters: effectiveFilters,
        planningProfile: profileLogPayload(planningProfile),
      },
    });
  }, [effectiveFilters, planningProfile, selectRegion]);

  const hoverRegion = useCallback((region: RegionAggregate) => {
    setHoveredRegionId(region.id);
  }, []);

  const toggleFlag = useCallback((id: string) => {
    const region = regions.find((item) => item.id === id);
    const flagged = flaggedIds.includes(id);
    setFlaggedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    logPlannerEvent({
      eventType: flagged ? "flag_removed" : "flag_added",
      payload: {
        region: region ? regionLogPayload(region) : { id },
        filters: effectiveFilters,
        planningProfile: profileLogPayload(planningProfile),
      },
    });
  }, [effectiveFilters, flaggedIds, planningProfile, regions]);

  const handleRouteSummary = useCallback((summary: RouteSummary | undefined) => {
    setRouteSummary(summary);
    if (summary?.destinationRegionId) {
      setHoveredRegionId(summary.destinationRegionId);
      setSelectedRegionId(summary.destinationRegionId);
      const region = regions.find((item) => item.id === summary.destinationRegionId);
      logPlannerEvent({
        eventType: "route_calculated",
        payload: {
          route: summary,
          region: region ? regionLogPayload(region) : { id: summary.destinationRegionId },
          filters: effectiveFilters,
          planningProfile: profileLogPayload(planningProfile),
        },
      });
    }
  }, [effectiveFilters, planningProfile, regions]);

  function saveScenario() {
    const scenario: PlanningScenario = {
      id: crypto.randomUUID(),
      name: `${filters.specialty} / ${filters.state === ALL_VALUE ? "India" : filters.state}`,
      createdAt: new Date().toISOString(),
      filters: effectiveFilters,
      flaggedRegionIds: flaggedIds,
      notes,
    };
    setScenarios((current) => [scenario, ...current].slice(0, 8));
    setNotes("");
    logPlannerEvent({
      eventType: "scenario_saved",
      payload: {
        scenario,
        flaggedRegions: flaggedRegions.map(regionLogPayload),
        planningProfile: profileLogPayload(planningProfile),
      },
    });
  }

  function openScenario(scenario: PlanningScenario) {
    setFilters(scenario.filters);
    setFlaggedIds(scenario.flaggedRegionIds);
    setNotes(scenario.notes);
    setSelectedRegionId(scenario.flaggedRegionIds[0]);
    setActiveTab("scenarios");
    logPlannerEvent({
      eventType: "scenario_opened",
      payload: {
        scenario,
        planningProfile: profileLogPayload(planningProfile),
      },
    });
  }

  function deleteScenario(id: string) {
    const scenario = scenarios.find((item) => item.id === id);
    setScenarios((current) => current.filter((scenario) => scenario.id !== id));
    logPlannerEvent({
      eventType: "scenario_deleted",
      payload: {
        scenarioId: id,
        scenario,
      },
    });
  }

  function updateFilters(next: Filters) {
    logPlannerEvent({
      eventType: "filters_changed",
      payload: {
        previous: effectiveFilters,
        next,
      },
    });
    setFilters(next);
    setSelectedRegionId(undefined);
    setHoveredRegionId(undefined);
    setRouteSummary(undefined);
  }

  return (
    <main>
      <nav className="topbar">
        <div className="brand-mark">
          <span className="voice-wheel" />
          <span>Medical Desert Planner</span>
        </div>
        <PlannerSearchBar filters={effectiveFilters} states={options.states} onChange={updateFilters} />
        <div className="topbar-actions">
          <button className={`mode-button ${activeMode === "explore" ? "active" : ""}`} type="button" onClick={() => setActiveMode("explore")}>
            <Grid2X2 size={18} /> Explore
          </button>
          <button className={`mode-button ${activeMode === "globe" ? "active" : ""}`} type="button" onClick={() => setActiveMode("globe")}>
            <Globe2 size={18} /> Globe
          </button>
          <button
            className={`mode-button ${showAskAi ? "active" : ""}`}
            type="button"
            onClick={() => {
              setShowAskAi((value) => !value);
              logPlannerEvent({
                eventType: showAskAi ? "ask_ai_closed" : "ask_ai_opened",
                payload: {
                  filters: effectiveFilters,
                  planningProfile: profileLogPayload(planningProfile),
                },
              });
            }}
          >
            <Bot size={18} /> Ask AI
          </button>
        </div>
      </nav>

      <header className="app-header">
        <h1>Find the highest-risk care gaps.</h1>
        <span className="source-badge">Data: {datasetSource}</span>
      </header>

      <section className="planner-layout full-width">
        <div className="mode-stage">
          {activeMode === "explore" && (
            <ExploreCards
              facilities={scopedRecords}
              regions={regions}
              selectedId={selectedRegion?.id}
              planningProfile={planningProfile}
              onSelect={selectRegion}
              onHover={hoverRegion}
            />
          )}

          {activeMode === "globe" && (
            <section className="ops-console globe-console">
              <aside className="filter-drawer">
          <div>
            <p className="eyebrow">Decision inputs</p>
            <h2>Specialty, evidence, place</h2>
          </div>
          <SpecialtyPlanningControls filters={effectiveFilters} onChange={updateFilters} />
          <RegionFilters filters={effectiveFilters} options={options} onChange={updateFilters} />
              </aside>

              <div className="map-column">
          <PlannerMap
            regions={regions}
            selected={selectedRegion}
            onSelect={selectRegion}
            onScopeRegion={scopeToRegion}
            onHover={hoverRegion}
            showRouting={showRouting}
            onToggleRouting={() => setShowRouting((value) => !value)}
            onRouteSummary={handleRouteSummary}
          />
          <section className="support-tabs" aria-label="Planner detail tabs">
            <div className="tab-switcher">
              <button type="button" className={activeTab === "zones" ? "active" : ""} onClick={() => setActiveTab("zones")}>Zones</button>
              <button type="button" className={activeTab === "deserts" ? "active" : ""} onClick={() => setActiveTab("deserts")}>Deserts</button>
              <button type="button" className={activeTab === "matrix" ? "active" : ""} onClick={() => setActiveTab("matrix")}>Matrix</button>
              <button type="button" className={activeTab === "details" ? "active" : ""} onClick={() => setActiveTab("details")}>Facilities</button>
              <button type="button" className={activeTab === "scenarios" ? "active" : ""} onClick={() => setActiveTab("scenarios")}>Scenarios</button>
            </div>
            <StatusLegend />
            {activeTab === "zones" && <RegionList regions={regions} selectedId={selectedRegion?.id} onSelect={selectRegion} onHover={hoverRegion} flaggedIds={flaggedIds} onToggleFlag={toggleFlag} />}
            {activeTab === "deserts" && <LargestDesertsPanel regions={regions} selectedId={selectedRegion?.id} onSelect={selectRegion} onHover={hoverRegion} />}
            {activeTab === "matrix" && <RiskMatrix regions={regions} selectedId={selectedRegion?.id} onSelect={selectRegion} onHover={hoverRegion} />}
            {activeTab === "details" && <InspectionPanel region={selectedRegion} capability={filters.capability} />}
            {activeTab === "scenarios" && (
              <ScenarioSidebar
                filters={effectiveFilters}
                flaggedIds={flaggedIds}
                scenarios={scenarios}
                notes={notes}
                onNotesChange={setNotes}
                onSave={saveScenario}
                onOpen={openScenario}
                onDelete={deleteScenario}
              />
            )}
          </section>
              </div>

              <RegionContextCard
          region={contextRegion}
          routeSummary={routeSummary}
          planningProfile={planningProfile}
          isFlagged={contextRegion ? flaggedIds.includes(contextRegion.id) : false}
          onToggleFlag={toggleFlag}
          onOpenHbpTable={() => {
            setShowHbpTable(true);
            logPlannerEvent({
              eventType: "hbp_estimate_opened",
              payload: {
                region: contextRegion ? regionLogPayload(contextRegion) : undefined,
                filters: effectiveFilters,
                planningProfile: profileLogPayload(planningProfile),
                hbpBenchmark: hbpBenchmarkForProfile(planningProfile.category, planningProfile.specialty),
              },
            });
          }}
              />
            </section>
          )}
        </div>
      </section>

      {showAskAi && (
        <div className="ask-overlay" role="dialog" aria-label="Ask AI planning assistant">
          <button className="ask-backdrop" type="button" aria-label="Close Ask AI" onClick={() => setShowAskAi(false)} />
          <div className="ask-drawer">
            <button className="scenario-delete ask-close" type="button" aria-label="Close Ask AI" onClick={() => setShowAskAi(false)}>
              x
            </button>
            <AskAiPanel filters={effectiveFilters} regions={regions} planningProfile={planningProfile} />
          </div>
        </div>
      )}

      {showHbpTable && <HbpRateModal category={planningProfile.category} specialty={planningProfile.specialty} onClose={() => setShowHbpTable(false)} />}

      <button className={`flags-fab ${flaggedIds.length ? "has-flags" : ""}`} type="button" onClick={() => setShowFlags(true)}>
        <Flag size={18} />
        <span>{flaggedIds.length}</span>
        <strong>Flags</strong>
      </button>

      {showFlags && (
        <div className="flags-overlay" role="dialog" aria-label="Flagged planning zones">
          <button className="flags-backdrop" type="button" aria-label="Close flags" onClick={() => setShowFlags(false)} />
          <aside className="flags-drawer">
            <div className="flags-header">
              <div>
                <p className="eyebrow">Flagged zones</p>
                <h2>{flaggedIds.length} planning flags</h2>
              </div>
              <button className="scenario-delete" type="button" aria-label="Close flags" onClick={() => setShowFlags(false)}>
                <X size={15} />
              </button>
            </div>
            {flaggedRegions.length ? (
              <div className="flags-list">
                {flaggedRegions.map((region) => (
                  <article key={region.id} className="flagged-zone-card">
                    <button type="button" onClick={() => openFlaggedRegion(region)}>
                      <strong>{region.villageTown}</strong>
                      <small>{region.district}, {region.state} - {region.pinCode}</small>
                    </button>
                    <div className="region-metrics">
                      <span>Risk {region.riskScore}</span>
                      <span>Trust {region.trustScore}</span>
                      <span>{region.status}</span>
                    </div>
                    <button className="ghost-button mini" type="button" onClick={() => toggleFlag(region.id)}>
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h2>No flagged zones yet.</h2>
                <p>Flag a zone from the map details or zone list to keep it here for quick review.</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}

function regionLogPayload(region: RegionAggregate) {
  return {
    id: region.id,
    villageTown: region.villageTown,
    district: region.district,
    state: region.state,
    pinCode: region.pinCode,
    status: region.status,
    riskScore: region.riskScore,
    trustScore: region.trustScore,
    population: region.population,
    nearestTertiaryMinutes: region.nearestTertiaryMinutes,
    facilityCount: region.facilityCount,
    capableFacilityCount: region.capableFacilityCount,
    capableBeds: region.capableBeds,
  };
}

function profileLogPayload(profile: typeof defaultProfile) {
  return {
    category: profile.category,
    subcategory: profile.subcategory,
    specialty: profile.specialty,
    capability: profile.capability,
    lifeCriticality: profile.lifeCriticality,
    costTier: profile.costTier,
    expectedLift: profile.expectedLift,
    gbdEvidence: profile.gbdEvidence,
  };
}

function applyKeyword(records: ReturnType<typeof generateHealthcareDataset>, keyword: string) {
  const term = keyword.trim().toLowerCase();
  if (!term) return records;
  return records.filter((record) => {
    const haystack = [
      record.facilityName,
      record.villageTown,
      record.subDistrict,
      record.district,
      record.state,
      record.pinCode,
      record.operationalStatus,
      ...record.capabilities,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(term);
  });
}
