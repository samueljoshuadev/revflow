import { describe, expect, it } from "vitest";

import { buildMirror } from "../lib/developments";
import {
  annualToMonthlyRate,
  priceInstallment,
  simulateFinancing,
} from "../lib/financing";

const base = {
  propertyPrice: 500_000,
  downPayment: 80_000,
  fgts: 20_000,
  annualRatePercent: 12,
  termMonths: 360,
  incomeCommitmentLimitPercent: 30,
};

describe("annualToMonthlyRate", () => {
  it("converts an effective annual rate to the equivalent monthly rate", () => {
    const monthly = annualToMonthlyRate(12);
    expect(Math.pow(1 + monthly, 12) - 1).toBeCloseTo(0.12, 10);
    expect(monthly).toBeCloseTo(0.0094888, 6);
  });
});

describe("priceInstallment", () => {
  it("matches the standard PMT formula", () => {
    // PMT(1%, 12, 10000) = 888.49
    expect(priceInstallment(10_000, 0.01, 12)).toBeCloseTo(888.49, 2);
  });

  it("divides evenly when the rate is zero", () => {
    expect(priceInstallment(12_000, 0, 12)).toBe(1000);
  });
});

describe("simulateFinancing", () => {
  it("deducts down payment and FGTS from the financed amount", () => {
    const result = simulateFinancing({ ...base, system: "price" });
    expect(result.financedAmount).toBe(400_000);
    expect(result.ltvPercent).toBe(80);
  });

  it("keeps Price installments constant", () => {
    const result = simulateFinancing({ ...base, system: "price" });
    expect(result.firstInstallment).toBe(result.lastInstallment);
    expect(result.totalPaid).toBeCloseTo(result.firstInstallment * 360, -1);
    expect(result.totalInterest).toBeGreaterThan(0);
  });

  it("computes decreasing SAC installments and exact total interest", () => {
    const result = simulateFinancing({ ...base, system: "sac" });
    const i = annualToMonthlyRate(12);
    const amortization = 400_000 / 360;
    expect(result.firstInstallment).toBeCloseTo(amortization + 400_000 * i, 2);
    expect(result.lastInstallment).toBeCloseTo(amortization * (1 + i), 2);
    expect(result.firstInstallment).toBeGreaterThan(result.lastInstallment);

    let balance = 400_000;
    let interest = 0;
    for (let month = 0; month < 360; month += 1) {
      interest += balance * i;
      balance -= amortization;
    }
    expect(result.totalInterest).toBeCloseTo(interest, 0);
  });

  it("derives the minimum income from the commitment limit", () => {
    const result = simulateFinancing({ ...base, system: "price" });
    expect(result.minimumIncome).toBeCloseTo(result.firstInstallment / 0.3, 1);
  });

  it("flags insufficient income", () => {
    const result = simulateFinancing({
      ...base,
      system: "sac",
      grossMonthlyIncome: 5_000,
    });
    expect(result.warnings).toContain("income_insufficient");
    expect(result.incomeCommitmentPercent).toBeGreaterThan(30);
  });

  it("flags LTV above the configured maximum and reports minimum own resources", () => {
    const result = simulateFinancing({
      ...base,
      downPayment: 30_000,
      fgts: 0,
      system: "price",
      maxLtvPercent: 80,
    });
    expect(result.warnings).toContain("ltv_exceeded");
    expect(result.minimumOwnResources).toBe(100_000);
  });

  it("reports no financing when own resources cover the price", () => {
    const result = simulateFinancing({
      ...base,
      downPayment: 500_000,
      fgts: 10_000,
      system: "price",
    });
    expect(result.financedAmount).toBe(0);
    expect(result.firstInstallment).toBe(0);
    expect(result.warnings).toEqual(
      expect.arrayContaining(["no_financing_needed", "down_payment_exceeds_price"]),
    );
  });
});

describe("buildMirror", () => {
  const tower = (id: string, name: string, position: number) => ({
    id,
    organization_id: "org",
    development_id: "dev",
    name,
    position,
    created_by: null,
    created_at: "",
    updated_at: "",
  });
  const unit = (code: string, towerId: string | null, floor: number | null, position: number) => ({
    id: `${towerId}-${code}`,
    organization_id: "org",
    development_id: "dev",
    tower_id: towerId,
    code,
    floor,
    position,
    typology: null,
    bedrooms: null,
    area_m2: null,
    parking_spaces: null,
    list_price: 1,
    status: "available" as const,
    status_changed_at: "",
    status_changed_by: null,
    notes: null,
    created_by: null,
    created_at: "",
    updated_at: "",
  });

  it("groups by tower, sorts floors top-down and units by position", () => {
    const mirror = buildMirror(
      [tower("a", "Torre A", 0), tower("b", "Torre B", 1)],
      [
        unit("102", "a", 1, 2),
        unit("101", "a", 1, 1),
        unit("201", "a", 2, 1),
        unit("Casa 1", null, null, 0),
      ],
    );
    expect(mirror.map((group) => group.tower?.name ?? null)).toEqual([
      "Torre A",
      "Torre B",
      null,
    ]);
    expect(mirror[0].floors.map((floor) => floor.floor)).toEqual([2, 1]);
    expect(mirror[0].floors[1].units.map((item) => item.code)).toEqual(["101", "102"]);
    expect(mirror[1].floors).toEqual([]);
    expect(mirror[2].floors[0].units[0].code).toBe("Casa 1");
  });
});
