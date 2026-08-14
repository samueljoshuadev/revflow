import { describe, expect, it } from "vitest";

import { parseLocalDateTimeWithOffset } from "../lib/datetime";
import { leadAnalysisSchema } from "../services/ai/schemas";
import { webhookProviderSchema } from "../services/webhooks/contracts";

describe("critical boundary contracts", () => {
  it("converts an explicit agency offset to UTC deterministically", () => {
    expect(
      parseLocalDateTimeWithOffset("2026-08-20T14:30", "-03:00").toISOString(),
    ).toBe("2026-08-20T17:30:00.000Z");
  });

  it("rejects malformed dates and offsets", () => {
    expect(() =>
      parseLocalDateTimeWithOffset("20/08/2026 14:30", "Brazil"),
    ).toThrow("Invalid local date");
  });

  it("accepts only the versioned structured lead analysis contract", () => {
    expect(
      leadAnalysisSchema.parse({
        score: 82,
        priority: "high",
        temperature: "hot",
        service: "Automação",
        estimated_value: 15000,
        intent: "Contratar automação comercial",
        urgency: "high",
        budget_fit: "compatible",
        reason: "Possui necessidade, prazo e orçamento compatível.",
        summary: "Lead aderente ao serviço solicitado.",
        next_action: "Agendar diagnóstico.",
      }).score,
    ).toBe(82);
    expect(() =>
      leadAnalysisSchema.parse({
        score: 101,
        priority: "high",
        temperature: "hot",
        service: "Automação",
        estimated_value: null,
        intent: "Automatizar atendimento",
        urgency: "medium",
        budget_fit: "unknown",
        reason: "Teste inválido",
        summary: "Inválido",
        next_action: "Ignorar",
        unexpected: "must not pass",
      }),
    ).toThrow();
  });

  it("does not accept an unimplemented webhook provider", () => {
    expect(webhookProviderSchema.safeParse("generic").success).toBe(false);
  });
});
