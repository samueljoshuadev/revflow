import { describe, expect, it } from "vitest";

import { parseLocalDateTimeWithOffset } from "../lib/datetime";
import { scorePropertyMatch } from "../lib/real-estate-matching";
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

  it("scores real-estate matches deterministically without AI", () => {
    const profile = {
      lead_id: "lead-1",
      organization_id: "org-1",
      budget_min: 400000,
      budget_max: 600000,
      preferred_city: "São Paulo",
      preferred_neighborhood: "Pinheiros",
      property_type: "apartment" as const,
      purpose: "sale" as const,
      minimum_bedrooms: 2,
      payment_method: "financing" as const,
      available_down_payment: 120000,
      urgency: "high" as const,
      purchase_deadline: "2026-12-31",
      created_by: null,
      created_at: "2026-08-15T00:00:00.000Z",
      updated_at: "2026-08-15T00:00:00.000Z",
    };
    const property = {
      id: "property-1",
      organization_id: "org-1",
      code: "RF-001",
      title: "Apartamento em Pinheiros",
      status: "available" as const,
      property_type: "apartment" as const,
      purpose: "sale" as const,
      price: 550000,
      city: "Sao Paulo",
      neighborhood: "Pinheiros",
      area_m2: 72,
      bedrooms: 2,
      bathrooms: 2,
      parking_spaces: 1,
      description: null,
      features: [],
      responsible_user_id: null,
      created_by: null,
      created_at: "2026-08-15T00:00:00.000Z",
      updated_at: "2026-08-15T00:00:00.000Z",
      archived_at: null,
    };
    const match = scorePropertyMatch(profile, property);
    expect(match.score).toBe(100);
    expect(match.reasons).toContain("cidade desejada");
    expect(match.reasons).toContain("na faixa de investimento");
  });
});
