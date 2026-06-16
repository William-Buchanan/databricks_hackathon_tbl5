import { useMemo, useState } from "react";
import { ExternalLink, Search, X } from "lucide-react";
import { formatInrRange, HBP_RATE_LIST_LABEL, HBP_RATE_LIST_URL, hbpBenchmarkForProfile, hbpRateRows, hbpRowsForProfile } from "../data/hbpRateList";

interface HbpRateModalProps {
  category: string;
  specialty: string;
  onClose: () => void;
}

export function HbpRateModal({ category, specialty, onClose }: HbpRateModalProps) {
  const [query, setQuery] = useState("");
  const matchedRows = useMemo(() => hbpRowsForProfile(category, specialty).rows, [category, specialty]);
  const matchedCodes = useMemo(() => new Set(matchedRows.map((row) => row.procedureCode)), [matchedRows]);
  const benchmark = useMemo(() => hbpBenchmarkForProfile(category, specialty), [category, specialty]);
  const visibleRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    const orderedRows = [...hbpRateRows].sort((a, b) => {
      const aMatch = matchedCodes.has(a.procedureCode) ? 0 : 1;
      const bMatch = matchedCodes.has(b.procedureCode) ? 0 : 1;
      return aMatch - bMatch || a.specialty.localeCompare(b.specialty) || a.procedureCode.localeCompare(b.procedureCode);
    });
    if (!term) return orderedRows;
    return orderedRows.filter((row) =>
      [
        row.specialty,
        row.specialtyCode,
        row.hbp20PackageCode,
        row.hbp10PackageCode,
        row.packageName,
        row.procedureCode,
        row.procedureName,
        String(row.procedurePriceInr),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [matchedCodes, query]);

  return (
    <div className="hbp-modal-overlay" role="dialog" aria-modal="true" aria-label="AB PM-JAY HBP 2.0 package table">
      <button className="hbp-backdrop" type="button" aria-label="Close HBP package table" onClick={onClose} />
      <section className="hbp-modal">
        <div className="hbp-modal-header">
          <div>
            <p className="eyebrow">Consolidated Master</p>
            <h2>AB PM-JAY HBP 2.0 package table</h2>
            <span>
              Highlighting {matchedRows.length} rows for {benchmark.matchLevel === "specialty" ? specialty : category} · {formatInrRange(benchmark.low, benchmark.high)}
            </span>
          </div>
          <button className="scenario-delete" type="button" aria-label="Close HBP package table" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="hbp-toolbar">
          <label>
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search package code, procedure, specialty..." />
          </label>
          <a href={HBP_RATE_LIST_URL} target="_blank" rel="noreferrer">
            {HBP_RATE_LIST_LABEL}
            <ExternalLink size={14} />
          </a>
        </div>

        <div className="hbp-table-shell">
          <table className="hbp-table">
            <thead>
              <tr>
                <th>Specialty</th>
                <th>Specialty Code</th>
                <th>HBP 2.0 Package Code</th>
                <th>HBP 1.0 Package Code</th>
                <th>Package Name</th>
                <th>Procedure Code</th>
                <th>Procedure Name</th>
                <th>Procedure Price</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const highlighted = matchedCodes.has(row.procedureCode);
                return (
                  <tr key={`${row.specialtyCode}-${row.procedureCode}-${row.hbp20PackageCode}`} className={highlighted ? "hbp-highlight-row" : ""}>
                    <td>{row.specialty}</td>
                    <td>{row.specialtyCode}</td>
                    <td>{row.hbp20PackageCode}</td>
                    <td>{row.hbp10PackageCode}</td>
                    <td>{row.packageName}</td>
                    <td>{row.procedureCode}</td>
                    <td>{row.procedureName}</td>
                    <td>₹{row.procedurePriceInr.toLocaleString("en-IN")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
