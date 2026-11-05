import { describe, expect, it } from "vitest";

import {
  describeDeadline,
  describeMissingRequirements,
  formatCpf,
  normalizeCpf,
} from "../lib/proposals";

const buyer = {
  id: "11111111-1111-1111-1111-111111111111",
  full_name: "Ana Souza",
  role: "buyer" as const,
  marital_status: "married" as const,
  income_type: "clt" as const,
};

describe("describeMissingRequirements", () => {
  it("translates database codes into broker-facing messages", () => {
    const result = describeMissingRequirements(
      [
        "spouse_missing",
        `${buyer.id}:cpf`,
        `${buyer.id}:doc:income_proof`,
        `${buyer.id}:doc:civil_status_certificate`,
      ],
      [buyer],
    );
    expect(result.map((item) => item.label)).toEqual([
      "Comprador casado ou em união estável: cadastre o cônjuge/companheiro(a).",
      "Ana Souza: preencher CPF.",
      "Ana Souza: enviar Holerite (últimos 3 meses).",
      "Ana Souza: enviar Certidão de casamento.",
    ]);
    expect(result[1].partyId).toBe(buyer.id);
  });

  it("handles a missing buyer", () => {
    expect(describeMissingRequirements(["buyer_missing"], [])[0].label).toBe(
      "Cadastre o comprador principal.",
    );
  });
});

describe("normalizeCpf", () => {
  it("accepts valid CPFs with or without punctuation", () => {
    expect(normalizeCpf("529.982.247-25")).toBe("52998224725");
    expect(normalizeCpf("12345678909")).toBe("12345678909");
  });

  it("rejects invalid check digits and repeated digits", () => {
    expect(normalizeCpf("529.982.247-26")).toBeNull();
    expect(normalizeCpf("111.111.111-11")).toBeNull();
    expect(normalizeCpf("123")).toBeNull();
  });

  it("formats CPFs", () => {
    expect(formatCpf("52998224725")).toBe("529.982.247-25");
  });
});

describe("describeDeadline", () => {
  const now = new Date("2026-11-05T12:00:00Z");

  it("describes remaining time", () => {
    expect(describeDeadline("2026-11-05T17:00:00Z", now)).toEqual({ overdue: false, text: "faltam 5 h" });
  });

  it("describes overdue deadlines", () => {
    expect(describeDeadline("2026-11-05T11:30:00Z", now)).toEqual({ overdue: true, text: "venceu há 30 min" });
  });

  it("returns null without a deadline", () => {
    expect(describeDeadline(null, now)).toBeNull();
  });
});
