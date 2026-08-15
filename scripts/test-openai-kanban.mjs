const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-5.4-nano";

if (!apiKey) {
  console.log(
    "SKIP OpenAI: defina OPENAI_API_KEY para executar o teste real da Responses API.",
  );
  process.exit(0);
}

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
    temperature: { type: "string", enum: ["cold", "warm", "hot"] },
    service: { type: "string", minLength: 1, maxLength: 100 },
    estimated_value: {
      anyOf: [{ type: "number", minimum: 0 }, { type: "null" }],
    },
    intent: { type: "string", minLength: 1, maxLength: 500 },
    urgency: { type: "string", enum: ["low", "medium", "high"] },
    budget_fit: {
      type: "string",
      enum: ["unknown", "below", "compatible", "above"],
    },
    summary: { type: "string", minLength: 1, maxLength: 2000 },
    next_action: { type: "string", minLength: 1, maxLength: 500 },
    reason: { type: "string", minLength: 1, maxLength: 1000 },
  },
  required: [
    "score",
    "priority",
    "temperature",
    "service",
    "estimated_value",
    "intent",
    "urgency",
    "budget_fit",
    "summary",
    "next_action",
    "reason",
  ],
};

const response = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model,
    store: false,
    max_output_tokens: 800,
    input: [
      {
        role: "system",
        content:
          "Qualifique o lead usando somente os dados recebidos. Não invente informações. Responda em português do Brasil.",
      },
      {
        role: "user",
        content: JSON.stringify({
          name: "Lead de validação",
          company: "Empresa de validação",
          source: "formulário",
          informed_budget: 12000,
          notes: [
            "Solicitou diagnóstico para organizar o processo comercial neste mês.",
          ],
        }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "lead_analysis",
        strict: true,
        schema,
      },
    },
  }),
  signal: AbortSignal.timeout(30_000),
});

if (!response.ok) {
  const requestId = response.headers.get("x-request-id") || "indisponível";
  throw new Error(
    `OpenAI respondeu HTTP ${response.status}. request_id=${requestId}`,
  );
}

const body = await response.json();
const outputText = body.output
  ?.flatMap((item) => item.content || [])
  .find((item) => item.type === "output_text")?.text;
if (!outputText) throw new Error("A OpenAI não retornou output_text.");

const result = JSON.parse(outputText);
const missing = schema.required.filter((key) => !(key in result));
if (missing.length > 0) {
  throw new Error(`Structured Output incompleto: ${missing.join(", ")}`);
}
if (!Number.isInteger(result.score) || result.score < 0 || result.score > 100) {
  throw new Error("Structured Output retornou score inválido.");
}

console.log(
  `PASS OpenAI: modelo=${model}; score=${result.score}; prioridade=${result.priority}; estrutura=válida.`,
);
