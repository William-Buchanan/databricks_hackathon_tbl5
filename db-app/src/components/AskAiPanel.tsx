import { Fragment, type ReactNode, FormEvent, useMemo, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { budgetBandInfo } from "../data/specialtyPlanning";
import type { Filters, RegionAggregate, SpecialtyPlanningProfile } from "../types";

interface AskAiPanelProps {
  filters: Filters;
  regions: RegionAggregate[];
  planningProfile: SpecialtyPlanningProfile;
}

interface Message {
  role: "planner" | "assistant";
  text: string;
}

const suggestions = [
  "Where are the highest-risk care gaps right now?",
  "Which gaps are real versus just data-poor?",
  "Show regions needing field verification before funding",
  "Which district or PIN code has the weakest evidence?",
  "Explain the facility evidence behind the top gap",
];

export function AskAiPanel({ filters, regions, planningProfile }: AskAiPanelProps) {
  const budget = budgetBandInfo(filters.budgetBand);
  const topRegions = useMemo(() => regions.slice(0, 8), [regions]);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: `Ask where ${planningProfile.category.toLowerCase()} access gaps are highest-risk, how confident the evidence is, which regions are data-poor, or how the GBD life-threatening score affects priority.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    setInput("");
    setMessages((current) => [...current, { role: "planner", text: trimmed }]);
    setLoading(true);
    try {
      const response = await fetch("/api/ask-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          filters,
          planningProfile,
          budget,
          regions: topRegions.map((region) => ({
            villageTown: region.villageTown,
            district: region.district,
            state: region.state,
            status: region.status,
            riskScore: region.riskScore,
            trustScore: region.trustScore,
            population: sourcePopulationText(region),
            populationSource: region.populationSource,
            nearestTertiaryMinutes: region.nearestTertiaryMinutes,
            capableFacilities: region.capableFacilityCount,
            facilities: region.facilityCount,
          })),
        }),
      });
      const data = (await response.json()) as { answer?: string };
      setMessages((current) => [...current, { role: "assistant", text: data.answer ?? localAnswer(trimmed, topRegions, planningProfile, budget.description) }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", text: localAnswer(trimmed, topRegions, planningProfile, budget.description) }]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(input);
  }

  return (
    <section className="ask-panel">
      <div className="ask-hero">
        <span>
          <Sparkles size={22} />
        </span>
        <div>
          <p className="eyebrow">Ask AI</p>
          <h2>Medical desert evidence copilot</h2>
          <p>
            Uses current filters, trust-weighted facility evidence, risk zones, specialty cost tier, and life-criticality signals to separate real care gaps from missing data.
          </p>
        </div>
      </div>
      <div className="prompt-suggestions">
        {suggestions.map((suggestion) => (
          <button key={suggestion} type="button" onClick={() => submit(suggestion)}>
            {suggestion}
          </button>
        ))}
      </div>
      <div className="chat-window">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`chat-message ${message.role}`}>
            {message.role === "assistant" ? <FormattedAssistantMessage text={message.text} /> : message.text}
          </div>
        ))}
        {loading && <div className="chat-message assistant">Reviewing the current planning context...</div>}
      </div>
      <form className="ask-composer" onSubmit={onSubmit}>
        <input value={input} placeholder="Ask about care gaps, confidence, weak evidence, audits, or interventions..." onChange={(event) => setInput(event.target.value)} />
        <button type="submit" aria-label="Send question">
          <Send size={18} />
        </button>
      </form>
    </section>
  );
}

function localAnswer(question: string, regions: RegionAggregate[], profile: SpecialtyPlanningProfile, budgetDescription: string) {
  const top = regions[0];
  if (!top) return "No regions are in scope. Broaden the filters and ask again.";
  return `Based on the current dataset, start with ${top.villageTown}, ${top.district}. It is classified as ${top.status} with risk ${top.riskScore}, trust ${top.trustScore}, ${sourcePopulationText(top)} population, and ${top.nearestTertiaryMinutes} minutes to tertiary care. For ${profile.category}, the GBD life-threatening score is ${profile.lifeCriticality}/5 using ${profile.gbdEvidence.primaryCause} and ${profile.gbdEvidence.preferredMeasure}; mortality relevance is ${profile.gbdEvidence.mortalityRelevance}/5 and YLL (years of life lost) relevance is ${profile.gbdEvidence.yllRelevance}/5. Cost is ${profile.costTier}/5 and expected lift is ${profile.expectedLift}/5. Based on that specialty cost tier, prioritize: ${budgetDescription} Question interpreted: "${question}".`;
}

function sourcePopulationText(region: RegionAggregate): string {
  if (region.population > 0 && (region.populationSource === "source" || region.populationSource === "mixed")) {
    return region.population.toLocaleString("en-IN");
  }
  return "unavailable source-backed";
}

function FormattedAssistantMessage({ text }: { text: string }) {
  const blocks = parseMarkdownBlocks(text);
  return (
    <div className="assistant-rich-text">
      {blocks.map((block, index) => {
        if (block.type === "heading") return <h3 key={index}>{formatInline(block.text)}</h3>;
        if (block.type === "paragraph") return <p key={index}>{formatInline(block.text)}</p>;
        if (block.type === "list") {
          return (
            <ol key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{formatInline(item)}</li>
              ))}
            </ol>
          );
        }
        return (
          <div key={index} className="assistant-table-wrap">
            <table>
              <thead>
                <tr>
                  {block.headers.map((cell, cellIndex) => (
                    <th key={cellIndex}>{formatInline(cell)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{formatInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

type MessageBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

function parseMarkdownBlocks(text: string): MessageBlock[] {
  const lines = text.replace(/\u001b\[[0-9;:]*[a-zA-Z]/g, "").split("\n");
  const blocks: MessageBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    if (line.startsWith("|") && line.endsWith("|")) {
      const tableLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("|") && lines[index].trim().endsWith("|")) {
        tableLines.push(lines[index].trim());
        index += 1;
      }
      const parsed = parseTable(tableLines);
      if (parsed) blocks.push(parsed);
      continue;
    }

    if (/^#{1,4}\s/.test(line)) {
      blocks.push({ type: "heading", text: line.replace(/^#{1,4}\s+/, "") });
      index += 1;
      continue;
    }

    if (/^\d+\.\s+/.test(line) || /^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].trim();
        if (!/^\d+\.\s+/.test(item) && !/^[-*]\s+/.test(item)) break;
        items.push(item.replace(/^\d+\.\s+/, "").replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length) {
      const next = lines[index].trim();
      if (!next || /^#{1,4}\s/.test(next) || /^\d+\.\s+/.test(next) || /^[-*]\s+/.test(next) || (next.startsWith("|") && next.endsWith("|"))) break;
      paragraph.push(next);
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

function parseTable(lines: string[]): MessageBlock | undefined {
  if (lines.length < 2) return undefined;
  const rows = lines.map((line) =>
    line
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim()),
  );
  const separator = rows[1]?.every((cell) => /^:?-{2,}:?$/.test(cell));
  const headers = rows[0];
  return {
    type: "table",
    headers,
    rows: separator ? rows.slice(2) : rows.slice(1),
  };
}

function formatInline(text: string): ReactNode {
  const cleaned = text.replace(/`([^`]+)`/g, "$1");
  const parts = cleaned.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}
