import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { randomUUID } from "node:crypto";

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
      server.middlewares.use("/api/log-event", async (request, response) => {
        await handleLogEvent(request, response);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/ask-ai", async (request, response) => {
        await handleAskAi(request, response, apiKey);
      });
      server.middlewares.use("/api/log-event", async (request, response) => {
        await handleLogEvent(request, response);
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
    let answer: string;
    if (!apiKey) {
      answer = localPlannerAnswer(body);
      await writeAuditEvent(request, "ai_panel_discussion", {
        question: body?.question,
        answer,
        filters: body?.filters,
        planningProfile: body?.planningProfile,
        budget: body?.budget,
        regions: body?.regions,
        aiProvider: "local-fallback",
      });
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ answer }));
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
              "You are a healthcare infrastructure planning assistant for India. Use only the supplied mock planning context. Distinguish verified medical deserts from data-poor regions. Explain the GBD life-threatening evidence basis, cost, confidence, and intervention tradeoffs. Keep answers concise and actionable.",
          },
          {
            role: "user",
            content: JSON.stringify(body),
          },
        ],
      }),
    });

    if (!openAiResponse.ok) {
      answer = `${localPlannerAnswer(body)}\n\nOpenAI request failed with ${openAiResponse.status}; using local fallback.`;
      await writeAuditEvent(request, "ai_panel_discussion", {
        question: body?.question,
        answer,
        filters: body?.filters,
        planningProfile: body?.planningProfile,
        budget: body?.budget,
        regions: body?.regions,
        aiProvider: "openai-fallback",
        openAiStatus: openAiResponse.status,
      });
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ answer }));
      return;
    }

    const data = await openAiResponse.json();
    answer = extractResponseText(data) || localPlannerAnswer(body);
    await writeAuditEvent(request, "ai_panel_discussion", {
      question: body?.question,
      answer,
      filters: body?.filters,
      planningProfile: body?.planningProfile,
      budget: body?.budget,
      regions: body?.regions,
      aiProvider: "openai",
      model: envModel(),
    });
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ answer }));
  } catch (error) {
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ answer: `I could not process the AI request, so here is the local planner fallback. ${(error as Error).message}` }));
  }
}

async function handleLogEvent(request: any, response: any) {
  if (request.method !== "POST") {
    response.statusCode = 405;
    response.end(JSON.stringify({ ok: false, error: "Use POST to log planner events." }));
    return;
  }

  try {
    const body = await readJson(request);
    await writeAuditEvent(request, String(body?.eventType ?? "planner_event"), {
      sessionId: body?.sessionId,
      url: body?.url,
      userAgent: body?.userAgent,
      payload: body?.payload ?? {},
    });
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ ok: true }));
  } catch (error) {
    response.statusCode = 200;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ ok: false, error: (error as Error).message }));
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
  return `Start with ${region.villageTown}, ${region.district}, ${region.state}. It is classified as ${region.status} with risk ${region.riskScore}, trust ${region.trustScore}, ${region.population?.toLocaleString?.("en-IN") ?? region.population} people, and ${region.nearestTertiaryMinutes} minutes to tertiary care. For ${profile.category}, the GBD life-threatening score is ${profile.lifeCriticality}/5 using ${profile.gbdEvidence?.primaryCause ?? "the selected cause"} and ${profile.gbdEvidence?.preferredMeasure ?? "GBD burden measures"} such as YLL (years of life lost). Cost is ${profile.costTier}/5 and expected lift is ${profile.expectedLift}/5. Specialty-derived intervention fit: ${budget?.label ?? "selected band"} - ${budget?.description ?? "prioritize the least capital-intensive intervention first."}`;
}

let tableReady = false;
let cachedToken: { accessToken: string; expiresAt: number } | undefined;
const userIdentityCache = new Map<string, { email: string; name: string; expiresAt: number }>();

async function writeAuditEvent(request: any, eventType: string, payload: Record<string, unknown>) {
  const tableName = process.env.APP_LOG_TABLE || "workspace.default.user_logs";
  const warehouseId = process.env.DATABRICKS_WAREHOUSE_ID;
  const identity = await currentUserIdentity(request);
  const event = {
    event_id: randomUUID(),
    app_name: process.env.DATABRICKS_APP_NAME ?? "medical-desert-planner",
    workspace_id: process.env.DATABRICKS_WORKSPACE_ID ?? "",
    event_type: eventType,
    user_email: identity.email || headerValue(request, ["x-forwarded-email", "x-databricks-user-email", "x-user-email"]),
    user_name: identity.name || headerValue(request, ["x-forwarded-user", "x-forwarded-preferred-username", "x-databricks-user-name"]),
    user_header: headerValue(request, ["x-forwarded-user", "x-forwarded-email", "x-databricks-user-email"]),
    session_id: typeof payload.sessionId === "string" ? payload.sessionId : "",
    request_path: request.url ?? "",
    url: typeof payload.url === "string" ? payload.url : "",
    user_agent: typeof payload.userAgent === "string" ? payload.userAgent : headerValue(request, ["user-agent"]),
    payload_json: JSON.stringify(payload),
  };

  if (!tableName || !warehouseId || !process.env.DATABRICKS_HOST) {
    console.log(JSON.stringify({ planner_audit_log: event }));
    return;
  }

  try {
    await ensureAuditTable(tableName, warehouseId);
    await executeSql(warehouseId, insertSql(tableName), [
      { name: "event_id", value: event.event_id, type: "STRING" },
      { name: "app_name", value: event.app_name, type: "STRING" },
      { name: "workspace_id", value: event.workspace_id, type: "STRING" },
      { name: "event_type", value: event.event_type, type: "STRING" },
      { name: "user_email", value: event.user_email, type: "STRING" },
      { name: "user_name", value: event.user_name, type: "STRING" },
      { name: "user_header", value: event.user_header, type: "STRING" },
      { name: "session_id", value: event.session_id, type: "STRING" },
      { name: "request_path", value: event.request_path, type: "STRING" },
      { name: "url", value: event.url, type: "STRING" },
      { name: "user_agent", value: event.user_agent, type: "STRING" },
      { name: "payload_json", value: event.payload_json, type: "STRING" },
    ]);
  } catch (error) {
    console.error(JSON.stringify({ planner_audit_log_error: (error as Error).message, event }));
  }
}

async function currentUserIdentity(request: any) {
  const oboToken = headerValue(request, ["x-forwarded-access-token"]);
  const host = process.env.DATABRICKS_HOST?.replace(/\/$/, "");
  if (!oboToken || !host) return { email: "", name: "" };

  const cached = userIdentityCache.get(oboToken);
  if (cached && cached.expiresAt > Date.now()) return cached;

  try {
    const response = await fetch(`${host}/api/2.0/preview/scim/v2/Me`, {
      headers: { Authorization: `Bearer ${oboToken}` },
    });
    if (!response.ok) return { email: "", name: "" };
    const data = (await response.json()) as { userName?: string; displayName?: string; emails?: Array<{ value?: string; primary?: boolean }> };
    const email = data.emails?.find((item) => item.primary)?.value ?? data.emails?.[0]?.value ?? data.userName ?? "";
    const identity = {
      email,
      name: data.displayName ?? data.userName ?? email,
      expiresAt: Date.now() + 5 * 60_000,
    };
    userIdentityCache.set(oboToken, identity);
    return identity;
  } catch {
    return { email: "", name: "" };
  }
}

async function ensureAuditTable(tableName: string, warehouseId: string) {
  if (tableReady) return;
  await executeSql(
    warehouseId,
    `CREATE TABLE IF NOT EXISTS ${qualifiedTableName(tableName)} (
      event_id STRING,
      event_ts TIMESTAMP,
      app_name STRING,
      workspace_id STRING,
      event_type STRING,
      user_email STRING,
      user_name STRING,
      user_header STRING,
      session_id STRING,
      request_path STRING,
      url STRING,
      user_agent STRING,
      payload_json STRING
    ) USING DELTA`,
    [],
  );
  tableReady = true;
}

function insertSql(tableName: string) {
  return `INSERT INTO ${qualifiedTableName(tableName)}
    (event_id, event_ts, app_name, workspace_id, event_type, user_email, user_name, user_header, session_id, request_path, url, user_agent, payload_json)
    VALUES (:event_id, current_timestamp(), :app_name, :workspace_id, :event_type, :user_email, :user_name, :user_header, :session_id, :request_path, :url, :user_agent, :payload_json)`;
}

async function executeSql(warehouseId: string, statement: string, parameters: Array<{ name: string; value: string; type: string }>) {
  const host = process.env.DATABRICKS_HOST?.replace(/\/$/, "");
  if (!host) throw new Error("DATABRICKS_HOST is not configured.");
  const token = await databricksAccessToken(host);
  const response = await fetch(`${host}/api/2.0/sql/statements`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      warehouse_id: warehouseId,
      statement,
      parameters,
      wait_timeout: "10s",
      on_wait_timeout: "CONTINUE",
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SQL statement failed with ${response.status}: ${text}`);
  }
}

async function databricksAccessToken(host: string) {
  if (process.env.DATABRICKS_TOKEN) return process.env.DATABRICKS_TOKEN;
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.accessToken;
  const clientId = process.env.DATABRICKS_CLIENT_ID;
  const clientSecret = process.env.DATABRICKS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Set DATABRICKS_TOKEN locally or use Databricks Apps service-principal env vars in production.");
  }

  const response = await fetch(`${host}/oidc/v1/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "all-apis",
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OAuth token request failed with ${response.status}: ${text}`);
  }
  const data = (await response.json()) as { access_token: string; expires_in?: number };
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.accessToken;
}

function qualifiedTableName(tableName: string) {
  const parts = tableName.split(".");
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(part))) {
    throw new Error("APP_LOG_TABLE must be schema.table or catalog.schema.table using only letters, numbers, and underscores.");
  }
  return parts.map((part) => `\`${part}\``).join(".");
}

function headerValue(request: any, names: string[]) {
  for (const name of names) {
    const value = request.headers?.[name.toLowerCase()];
    if (Array.isArray(value)) return value.join(",");
    if (typeof value === "string") return value;
  }
  return "";
}
