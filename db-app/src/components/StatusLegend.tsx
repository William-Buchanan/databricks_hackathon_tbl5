import { STATUS_LEGEND_ITEMS, statusClass } from "./RiskMatrix";

export function StatusLegend() {
  return (
    <div className="status-legend" aria-label="Zone color codes">
      <strong>Color codes</strong>
      {STATUS_LEGEND_ITEMS.map((item) => (
        <span key={item.id} title={item.hint}>
          <i className={statusClass(item.title)} /> {item.title}
        </span>
      ))}
    </div>
  );
}
