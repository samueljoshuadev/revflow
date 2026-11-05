import { describe, expect, it } from "vitest";

import {
  addMonths,
  analyzeProposal,
  calculateCommission,
  expandSchedule,
  monthsBetween,
  toCommercialRules,
  type CommercialRules,
  type PaymentItem,
} from "../lib/proposal-analysis";

const rules: CommercialRules = {
  max_discount_percent: 5,
  min_down_payment_percent: 10,
  max_down_payment_installments: 6,
  min_paid_until_keys_percent: 20,
  present_value_monthly_rate: 1,
  commission_percent: 5,
  broker_share: 60,
  manager_share: 20,
  director_share: 10,
  partner_share: 10,
  commission_payment_rule: "with_down_payment",
  commission_max_installments: null,
};

// Oferta de 480 mil: sinal 48 mil + 4x 12 mil de entrada + 384 mil financiados na entrega.
const plan: PaymentItem[] = [
  { kind: "signal", installment_count: 1, installment_amount: 48_000, first_due_date: "2026-12-01", interval_months: 1 },
  { kind: "down_payment", installment_count: 4, installment_amount: 12_000, first_due_date: "2027-01-10", interval_months: 1 },
  { kind: "financing", installment_count: 1, installment_amount: 384_000, first_due_date: "2028-06-01", interval_months: 1 },
];

const baseInput = {
  listPrice: 500_000,
  offeredPrice: 480_000,
  items: plan,
  rules,
  deliveryDate: "2028-06-01",
  referenceDate: "2026-12-01",
  developmentTotalVgv: 50_000_000,
};

describe("schedule helpers", () => {
  it("adds months clamping to the end of the month", () => {
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonths("2026-12-10", 3)).toBe("2027-03-10");
  });

  it("counts months between dates", () => {
    expect(monthsBetween("2026-12-01", "2027-12-01")).toBe(12);
    expect(monthsBetween("2027-12-01", "2026-12-01")).toBe(0);
  });

  it("expands installments in date order", () => {
    const schedule = expandSchedule(plan);
    expect(schedule).toHaveLength(6);
    expect(schedule.map((payment) => payment.date)).toEqual([
      "2026-12-01",
      "2027-01-10",
      "2027-02-10",
      "2027-03-10",
      "2027-04-10",
      "2028-06-01",
    ]);
  });
});

describe("analyzeProposal", () => {
  it("approves a proposal inside the rules", () => {
    const result = analyzeProposal(baseInput);
    expect(result.discountPercent).toBe(4);
    expect(result.downPayment).toBe(96_000);
    expect(result.downPaymentPercent).toBe(20);
    expect(result.downPaymentInstallments).toBe(5);
    expect(result.paidUntilKeysPercent).toBe(20);
    expect(result.vgvImpact).toBe(-20_000);
    expect(result.vgvImpactPercent).toBe(-0.04);
    expect(result.checks.find((check) => check.key === "discount")?.status).toBe("pass");
    // Financiamento 18 meses à frente a 1% a.m. derruba o valor presente.
    expect(result.presentValue).toBeLessThan(480_000);
    expect(result.checks.find((check) => check.key === "present_value")?.status).toBe("warn");
    expect(result.verdict).toBe("attention");
  });

  it("flags discount and down payment outside the rules", () => {
    const result = analyzeProposal({
      ...baseInput,
      offeredPrice: 450_000,
      items: [
        { kind: "signal", installment_count: 1, installment_amount: 20_000, first_due_date: "2026-12-01", interval_months: 1 },
        { kind: "financing", installment_count: 1, installment_amount: 430_000, first_due_date: "2028-06-01", interval_months: 1 },
      ],
    });
    expect(result.checks.find((check) => check.key === "discount")?.status).toBe("fail");
    expect(result.checks.find((check) => check.key === "down_payment")?.status).toBe("fail");
    expect(result.verdict).toBe("outside_rules");
    expect(result.score).toBeLessThan(50);
  });

  it("fails when the plan does not add up to the offer", () => {
    const result = analyzeProposal({ ...baseInput, offeredPrice: 490_000 });
    expect(result.checks.find((check) => check.key === "plan_total")?.status).toBe("fail");
  });

  it("reports no rules when the developer has not configured limits", () => {
    const result = analyzeProposal({ ...baseInput, rules: null });
    expect(result.verdict).toBe("no_rules");
    expect(result.presentValue).toBe(480_000);
  });
});

describe("calculateCommission", () => {
  it("splits the commission by role and leaves inactive shares unallocated", () => {
    const result = calculateCommission({
      rules,
      offeredPrice: 480_000,
      items: plan,
      hasManager: true,
      hasDirector: false,
      hasPartner: false,
    });
    expect(result?.total).toBe(24_000);
    expect(result?.split.find((item) => item.role === "broker")?.amount).toBe(14_400);
    expect(result?.split.find((item) => item.role === "manager")?.amount).toBe(4_800);
    expect(result?.unallocated).toBe(4_800);
  });

  it("pays the commission along with the down payment receipts", () => {
    const result = calculateCommission({ rules, offeredPrice: 480_000, items: plan, hasManager: true, hasDirector: true, hasPartner: true });
    expect(result?.payments).toEqual([
      { date: "2026-12-01", amount: 12_000 },
      { date: "2027-01-10", amount: 3_000 },
      { date: "2027-02-10", amount: 3_000 },
      { date: "2027-03-10", amount: 3_000 },
      { date: "2027-04-10", amount: 3_000 },
    ]);
  });

  it("groups receipts when installments are limited, never paying before the client", () => {
    const result = calculateCommission({
      rules: { ...rules, commission_max_installments: 2 },
      offeredPrice: 480_000,
      items: plan,
      hasManager: true,
      hasDirector: true,
      hasPartner: true,
    });
    expect(result?.payments).toEqual([
      { date: "2027-02-10", amount: 18_000 },
      { date: "2027-04-10", amount: 6_000 },
    ]);
  });

  it("pays everything upfront when configured", () => {
    const result = calculateCommission({
      rules: { ...rules, commission_payment_rule: "upfront" },
      offeredPrice: 480_000,
      items: plan,
      hasManager: true,
      hasDirector: true,
      hasPartner: true,
    });
    expect(result?.payments).toEqual([{ date: "2026-12-01", amount: 24_000 }]);
  });

  it("returns null without a commission percentage", () => {
    expect(
      calculateCommission({ rules: { ...rules, commission_percent: null }, offeredPrice: 1, items: plan, hasManager: false, hasDirector: false, hasPartner: false }),
    ).toBeNull();
  });
});

describe("toCommercialRules", () => {
  it("parses database numerics and snapshots", () => {
    const parsed = toCommercialRules({ max_discount_percent: "5.00", broker_share: "60", commission_payment_rule: "upfront" });
    expect(parsed?.max_discount_percent).toBe(5);
    expect(parsed?.broker_share).toBe(60);
    expect(parsed?.manager_share).toBe(0);
    expect(parsed?.commission_payment_rule).toBe("upfront");
    expect(toCommercialRules(null)).toBeNull();
  });
});
