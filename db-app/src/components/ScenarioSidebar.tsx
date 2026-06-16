import { Save, StickyNote, X } from "lucide-react";
import type { Filters, PlanningScenario } from "../types";

interface ScenarioSidebarProps {
  filters: Filters;
  flaggedIds: string[];
  scenarios: PlanningScenario[];
  notes: string;
  onNotesChange: (value: string) => void;
  onSave: () => void;
  onOpen: (scenario: PlanningScenario) => void;
  onDelete: (id: string) => void;
}

export function ScenarioSidebar({ flaggedIds, scenarios, notes, onNotesChange, onSave, onOpen, onDelete }: ScenarioSidebarProps) {
  return (
    <aside className="scenario-sidebar">
      <div>
        <p className="eyebrow">Scenario management</p>
        <h2>Planning history</h2>
      </div>
      <label className="notes-label">
        <span>
          <StickyNote size={14} /> Planning notes
        </span>
        <textarea
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Add field assumptions, planned mobile unit placement, or survey requests."
        />
      </label>
      <button type="button" className="primary-button sidebar-save" onClick={onSave}>
        <Save size={15} /> Save Planning Scenario
      </button>
      <div className="scenario-summary">
        <span>{flaggedIds.length} flagged regions</span>
        <span>{scenarios.length} saved scenarios</span>
      </div>
      <div className="scenario-list">
        {scenarios.length === 0 ? (
          <p className="muted">No saved scenarios yet.</p>
        ) : (
          scenarios.map((scenario) => (
            <div key={scenario.id} className="scenario-item">
              <button type="button" className="scenario-open" onClick={() => onOpen(scenario)}>
                <strong>{scenario.name}</strong>
                <span>{new Date(scenario.createdAt).toLocaleString()}</span>
              <small>
                  {scenario.filters.specialty} - {scenario.flaggedRegionIds.length} regions
              </small>
                {scenario.notes.trim() && <em>{scenario.notes}</em>}
              </button>
              <button type="button" className="scenario-delete" aria-label={`Delete ${scenario.name}`} onClick={() => onDelete(scenario.id)}>
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
