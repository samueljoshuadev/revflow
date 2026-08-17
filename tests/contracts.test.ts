import { describe, expect, it } from "vitest";

import { parseLocalDateTimeWithOffset } from "../lib/datetime";
import { createCsv, parseCsv } from "../lib/csv";
import {
  PayloadTooLargeError,
  readLimitedJson,
} from "../lib/http/read-limited-json";
import { getKanbanAutomationDecision } from "../lib/kanban-automation";
import { parseMetaEmbeddedSignupMessage } from "../lib/meta-embedded-signup";
import { scorePropertyMatch } from "../lib/real-estate-matching";
import { leadAnalysisSchema } from "../services/ai/schemas";
import { webhookProviderSchema } from "../services/webhooks/contracts";

describe("critical boundary contracts", () => {
  it("parses quoted CSV fields and preserves row boundaries", () => {
    expect(
      parseCsv(
        'Nome;E-mail;Observações\r\n"Ana; Silva";ana@example.com;"Linha 1\nLinha 2"',
      ),
    ).toEqual({
      headers: ["Nome", "E-mail", "Observações"],
      rows: [["Ana; Silva", "ana@example.com", "Linha 1\nLinha 2"]],
    });
    expect(
      createCsv([
        ["linha", "motivo"],
        [2, 'Valor com "aspas"'],
      ]),
    ).toContain('"Valor com ""aspas"""');
  });

  it("rejects a CSV without data rows or with an unclosed quote", () => {
    expect(() => parseCsv("Nome,E-mail")).toThrow("csv_without_rows");
    expect(() => parseCsv('Nome,E-mail\n"Ana,ana@example.com')).toThrow(
      "csv_unclosed_quote",
    );
  });
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

  it("advances an agency lead only to the reviewed qualification stage", () => {
    const stages = [
      {
        id: "new",
        name: "Novo lead",
        slug: "novo-lead",
        position: 0,
        is_closed: false,
      },
      {
        id: "qualified",
        name: "Qualificado",
        slug: "qualificado",
        position: 3,
        is_closed: false,
      },
      {
        id: "won",
        name: "Fechado",
        slug: "fechado",
        position: 7,
        is_closed: true,
      },
    ];
    const decision = getKanbanAutomationDecision({
      vertical: "agency",
      currentStage: stages[0],
      stages,
      analysis: leadAnalysisSchema.parse({
        score: 82,
        priority: "high",
        temperature: "hot",
        service: "Automação",
        estimated_value: 12000,
        intent: "Organizar o processo comercial",
        urgency: "high",
        budget_fit: "compatible",
        reason: "Necessidade, prazo e orçamento informados.",
        summary: "Lead com contexto suficiente para qualificação.",
        next_action: "Agendar diagnóstico.",
      }),
      hasCompleteRealEstateProfile: false,
    });
    expect(decision?.targetStageId).toBe("qualified");
  });

  it("keeps the Kanban unchanged for low confidence or incomplete real-estate profile", () => {
    const newStage = {
      id: "new",
      name: "Novo lead",
      slug: "novo-lead",
      position: 0,
      is_closed: false,
    };
    const stages = [
      newStage,
      {
        id: "profile",
        name: "Perfil identificado",
        slug: "perfil-identificado",
        position: 1,
        is_closed: false,
      },
    ];
    const analysis = leadAnalysisSchema.parse({
      score: 59,
      priority: "medium",
      temperature: "warm",
      service: "Imóvel",
      estimated_value: null,
      intent: "Pesquisar opções",
      urgency: "low",
      budget_fit: "unknown",
      reason: "Contexto insuficiente.",
      summary: "Lead ainda precisa informar o perfil.",
      next_action: "Confirmar orçamento e região.",
    });
    expect(
      getKanbanAutomationDecision({
        vertical: "real_estate",
        currentStage: newStage,
        stages,
        analysis,
        hasCompleteRealEstateProfile: false,
      }),
    ).toBeNull();
  });

  it("accepts Meta Embedded Signup completion only from a trusted Facebook origin", () => {
    expect(
      parseMetaEmbeddedSignupMessage({
        origin: "https://www.facebook.com",
        data: JSON.stringify({
          type: "WA_EMBEDDED_SIGNUP",
          event: "FINISH",
          data: {
            waba_id: "123456789012345",
            phone_number_id: "987654321098765",
          },
        }),
      }),
    ).toEqual({
      type: "finished",
      result: {
        businessAccountId: "123456789012345",
        phoneNumberId: "987654321098765",
      },
    });
    expect(
      parseMetaEmbeddedSignupMessage({
        origin: "https://facebook.example.test",
        data: {
          type: "WA_EMBEDDED_SIGNUP",
          event: "FINISH",
          data: {
            waba_id: "123456789012345",
            phone_number_id: "987654321098765",
          },
        },
      }),
    ).toBeNull();
  });
});

describe("bounded request bodies", () => {
  it("reads valid JSON below the byte limit", async () => {
    const request = new Request("https://revflow.example/api", {
      method: "POST",
      body: JSON.stringify({ name: "Lead" }),
      headers: { "content-type": "application/json" },
    });
    await expect(readLimitedJson(request, 100)).resolves.toEqual({
      name: "Lead",
    });
  });

  it("rejects streamed content that exceeds the real limit", async () => {
    const request = new Request("https://revflow.example/api", {
      method: "POST",
      body: JSON.stringify({ content: "x".repeat(100) }),
      headers: { "content-type": "application/json" },
    });
    await expect(readLimitedJson(request, 20)).rejects.toBeInstanceOf(
      PayloadTooLargeError,
    );
  });
});
