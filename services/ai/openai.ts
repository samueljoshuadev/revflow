import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  LEAD_ANALYSIS_SCHEMA_VERSION,
  leadAnalysisSchema,
} from "@/services/ai/schemas";
import { getIntegrationCredential } from "@/services/integrations/credentials";

const PROMPT_VERSION = "lead-qualification-2026-08-14";

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
    temperature: { type: "string", enum: ["cold", "warm", "hot"] },
    service: { type: "string", minLength: 1, maxLength: 100 },
    estimated_value: { anyOf: [{ type: "number", minimum: 0 }, { type: "null" }] },
    intent: { type: "string", minLength: 1, maxLength: 500 },
    urgency: { type: "string", enum: ["low", "medium", "high"] },
    budget_fit: { type: "string", enum: ["unknown", "below", "compatible", "above"] },
    summary: { type: "string", minLength: 1, maxLength: 2000 },
    next_action: { type: "string", minLength: 1, maxLength: 500 },
    reason: { type: "string", minLength: 1, maxLength: 1000 },
  },
  required: ["score", "priority", "temperature", "service", "estimated_value", "intent", "urgency", "budget_fit", "summary", "next_action", "reason"],
} as const;

type Credential = { apiKey: string };

export async function isAutomaticQualificationEnabled(organizationId: string) {
  const admin = createAdminClient();
  if (!admin) return false;
  const { data } = await admin
    .from("integration_connections")
    .select("status, config")
    .eq("organization_id", organizationId)
    .eq("provider", "openai")
    .maybeSingle();
  return data?.status === "connected" && asRecord(data.config).automatic_qualification === true;
}

export async function qualifyLeadWithOpenAi(
  organizationId: string,
  leadId: string,
) {
  const admin = createAdminClient();
  if (!admin && !process.env.OPENAI_API_KEY) throw new Error("ai_worker_not_configured");
  const database = admin ?? (await createClient());
  const [connectionResult, leadResult, notesResult] = await Promise.all([
    database.from("integration_connections").select("status, config").eq("organization_id", organizationId).eq("provider", "openai").maybeSingle(),
    database.from("leads").select("id, name, company, source, estimated_budget, summary, next_action, service_id").eq("organization_id", organizationId).eq("id", leadId).maybeSingle(),
    database.from("lead_notes").select("content").eq("organization_id", organizationId).eq("lead_id", leadId).order("created_at", { ascending: false }).limit(20),
  ]);
  if (connectionResult.error || leadResult.error || notesResult.error) throw new Error("ai_context_load_failed");
  if (connectionResult.data?.status !== "connected") throw new Error("ai_not_connected");
  if (!leadResult.data) throw new Error("lead_not_found");
  const config = asRecord(connectionResult.data.config);
  const model = typeof config.model === "string" ? config.model : process.env.OPENAI_MODEL ?? "gpt-5.4-nano";
  const monthlyLimit = typeof config.monthly_limit === "number" ? config.monthly_limit : 500;
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { count } = await database.from("ai_analyses").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).gte("created_at", monthStart.toISOString());
  if ((count ?? 0) >= monthlyLimit) throw new Error("ai_monthly_limit_reached");

  const stored = admin
    ? await getIntegrationCredential<Credential>(organizationId, "openai", admin)
    : null;
  const apiKey = stored?.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("openai_key_missing");
  const lead = leadResult.data;
  const input = JSON.stringify({
    name: lead.name,
    company: lead.company,
    source: lead.source,
    informed_budget: lead.estimated_budget,
    current_summary: lead.summary,
    current_next_action: lead.next_action,
    notes: notesResult.data.map((note) => note.content),
  });
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 1200,
      input: [
        { role: "system", content: "Você qualifica leads B2B de uma agência. Use apenas os dados recebidos, não invente orçamento nem intenção e escreva em português do Brasil. Se um dado não existir, sinalize a incerteza." },
        { role: "user", content: input },
      ],
      text: { format: { type: "json_schema", name: "lead_analysis", strict: true, schema: jsonSchema } },
    }),
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`openai_http_${response.status}`);
  const body = (await response.json()) as {
    output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const outputText = body.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
  if (!outputText) throw new Error("openai_empty_output");
  const analysis = leadAnalysisSchema.parse(JSON.parse(outputText));

  const userClient = await createClient();
  const { error } = await userClient.rpc("apply_lead_ai_analysis", {
    p_organization_id: organizationId,
    p_lead_id: leadId,
    p_model: model,
    p_prompt_version: PROMPT_VERSION,
    p_schema_version: LEAD_ANALYSIS_SCHEMA_VERSION,
    p_result: analysis,
    p_input_tokens: body.usage?.input_tokens ?? null,
    p_output_tokens: body.usage?.output_tokens ?? null,
  });
  if (error) throw error;
  return analysis;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
