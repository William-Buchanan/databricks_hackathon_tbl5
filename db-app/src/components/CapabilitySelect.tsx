import type { Capability } from "../types";

interface CapabilitySelectProps {
  capabilities: Capability[];
  value: Capability;
  onChange: (value: Capability) => void;
}

export function CapabilitySelect({ capabilities, value, onChange }: CapabilitySelectProps) {
  return (
    <div className="capability-strip" aria-label="Clinical capability">
      {capabilities.map((capability) => (
        <button
          key={capability}
          type="button"
          className={`tab-pill ${value === capability ? "active" : ""}`}
          onClick={() => onChange(capability)}
        >
          {capability}
        </button>
      ))}
    </div>
  );
}
