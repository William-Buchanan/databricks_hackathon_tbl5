import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), askAiPlugin(env.OPENAI_API_KEY)],
  };
});

function askAiPlugin(apiKey?: string): Plugin {
  return {
    name: "medical-desert-ask-ai",
    configureServer(server) {
      server.middlewares.use("/api/ask-ai", async (request, response) => {
        await handleAskAi(request, response, apiKey);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/ask-ai", async (request, response) => {
        await handleAskAi(request, response, apiKey);
      });
    },
  };
}

async function handleAskAi(request: any, response: any, apiKey?: string) {
  if (request.method !== "POST") {
    response.statusCode = 405;
    response.end(JSON.stringify({ answer: "Use POST to ask a planning question." }));
    return;
  }

  try {
    const body = await readJson(request);
    if (!apiKey) {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ answer: localPlannerAnswer(body) }));
      return;
    }

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: envModel(),
        input: [
          {
            role: "system",
            content:
              "You are a healthcare infrastructure planning assistant for India. Use only the supplied mock planning context. Distinguish verified medical deserts from data-poor regions. Explain budget fit, life-criticality, cost, and intervention tradeoffs. Keep answers concise and actionable.",
          },
          {
            role: "user",
            content: JSON.stringify(body),
          },
        ],
      }),
    });

    if (!openAiResponse.ok) {
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ answer: `${localPlannerAnswer(body)}\n\nOpenAI request failed with ${openAiResponse.status}; using local fallback.` }));
      return;
    }

    const data = await openAiResponse.json();
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ answer: extractResponseText(data) || localPlannerAnswer(body) }));
  } catch (error) {
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ answer: `I could not process the AI request, so here is the local planner fallback. ${(error as Error).message}` }));
  }
}

function envModel() {
  return process.env.OPENAI_MODEL || "gpt-5.5";
}

function readJson(request: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function extractResponseText(data: any): string {
  if (typeof data.output_text === "string") return data.output_text;
  const parts = data.output?.flatMap((item: any) => item.content ?? []) ?? [];
  return parts.map((part: any) => part.text).filter(Boolean).join("\n");
}

function localPlannerAnswer(body: any): string {
  const region = body?.regions?.[0];
  const profile = body?.planningProfile;
  const budget = body?.budget;
  if (!region || !profile) {
    return "Broaden the filters so there are regions in scope, then ask again.";
  }
  return `Start with ${region.villageTown}, ${region.district}, ${region.state}. It is classified as ${region.status} with risk ${region.riskScore}, trust ${region.trustScore}, ${region.population?.toLocaleString?.("en-IN") ?? region.population} people, and ${region.nearestTertiaryMinutes} minutes to tertiary care. For ${profile.category}, life-criticality is ${profile.lifeCriticality}/5, cost is ${profile.costTier}/5, and expected lift is ${profile.expectedLift}/5. Budget fit: ${budget?.label ?? "selected band"} - ${budget?.description ?? "prioritize the least capital-intensive intervention first."}`;
}
