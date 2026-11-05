/**
 * Analisador de proposta e cálculo de comissão.
 *
 * Determinístico e sem dependências: recebe o fluxo de pagamento salvo no
 * banco e as regras comerciais da incorporadora (a cópia gravada no envio,
 * ou as regras atuais enquanto a proposta é rascunho).
 */

export type PaymentKind =
  | "signal"
  | "down_payment"
  | "monthly"
  | "intermediate"
  | "keys"
  | "fgts"
  | "financing";

export type PaymentItem = {
  kind: PaymentKind;
  installment_count: number;
  installment_amount: number;
  /** YYYY-MM-DD */
  first_due_date: string;
  interval_months: number;
};

export type CommercialRules = {
  max_discount_percent: number | null;
  min_down_payment_percent: number | null;
  max_down_payment_installments: number | null;
  min_paid_until_keys_percent: number | null;
  /** Taxa de desconto mensal (%) para o valor presente do fluxo. */
  present_value_monthly_rate: number | null;
  commission_percent: number | null;
  broker_share: number;
  manager_share: number;
  director_share: number;
  partner_share: number;
  commission_payment_rule: "upfront" | "with_down_payment";
  commission_max_installments: number | null;
};

export type ScheduledPayment = { date: string; amount: number; kind: PaymentKind };

export type CheckStatus = "pass" | "warn" | "fail" | "info";
export type AnalysisCheck = {
  key:
    | "plan_total"
    | "discount"
    | "present_value"
    | "down_payment"
    | "down_payment_installments"
    | "paid_until_keys";
  label: string;
  status: CheckStatus;
  detail: string;
};

export type ProposalAnalysis = {
  verdict: "good" | "attention" | "outside_rules" | "no_rules";
  score: number;
  planTotal: number;
  discountPercent: number;
  downPayment: number;
  downPaymentPercent: number;
  downPaymentInstallments: number;
  paidUntilKeys: number;
  paidUntilKeysPercent: number;
  presentValue: number;
  effectiveDiscountPercent: number;
  vgvImpact: number;
  vgvImpactPercent: number | null;
  checks: AnalysisCheck[];
};

export const paymentKindLabels: Record<PaymentKind, string> = {
  signal: "Sinal / ato",
  down_payment: "Entrada parcelada",
  monthly: "Mensais",
  intermediate: "Intermediárias (balões)",
  keys: "Chaves",
  fgts: "FGTS",
  financing: "Financiamento bancário",
};

const DOWN_KINDS: PaymentKind[] = ["signal", "down_payment"];

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const pct = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

/** Soma meses mantendo o dia (limitado ao fim do mês). Retorna YYYY-MM-DD. */
export function addMonths(value: string, months: number) {
  const { year, month, day } = parseDate(value);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

/** Meses (fracionários) entre duas datas; nunca negativo. */
export function monthsBetween(from: string, to: string) {
  const a = parseDate(from);
  const b = parseDate(to);
  const months = (b.year - a.year) * 12 + (b.month - a.month) + (b.day - a.day) / 30;
  return Math.max(0, months);
}

/** Expande o fluxo em pagamentos individuais, em ordem de data. */
export function expandSchedule(items: PaymentItem[]): ScheduledPayment[] {
  const payments: ScheduledPayment[] = [];
  for (const item of items) {
    for (let index = 0; index < item.installment_count; index += 1) {
      payments.push({
        date: addMonths(item.first_due_date, index * Math.max(1, item.interval_months)),
        amount: item.installment_amount,
        kind: item.kind,
      });
    }
  }
  return payments.sort((left, right) => left.date.localeCompare(right.date));
}

export function analyzeProposal(input: {
  listPrice: number;
  offeredPrice: number;
  items: PaymentItem[];
  rules: CommercialRules | null;
  deliveryDate: string | null;
  referenceDate: string;
  developmentTotalVgv: number | null;
}): ProposalAnalysis {
  const { listPrice, offeredPrice, items, rules } = input;
  const schedule = expandSchedule(items);
  const planTotal = round2(schedule.reduce((sum, payment) => sum + payment.amount, 0));
  const planMatches = items.length > 0 && Math.abs(planTotal - offeredPrice) <= 0.01;

  const discountPercent = listPrice > 0 ? ((listPrice - offeredPrice) / listPrice) * 100 : 0;
  const downPayment = schedule
    .filter((payment) => DOWN_KINDS.includes(payment.kind))
    .reduce((sum, payment) => sum + payment.amount, 0);
  const downPaymentPercent = offeredPrice > 0 ? (downPayment / offeredPrice) * 100 : 0;
  const downPaymentInstallments = items
    .filter((item) => DOWN_KINDS.includes(item.kind))
    .reduce((sum, item) => sum + item.installment_count, 0);

  // Pago até as chaves: tudo que não é financiamento e vence até a entrega,
  // mais a parcela de chaves. Sem data de entrega, considera todo o fluxo próprio.
  const paidUntilKeys = schedule
    .filter((payment) => payment.kind !== "financing")
    .filter((payment) => !input.deliveryDate || payment.kind === "keys" || payment.date <= input.deliveryDate)
    .reduce((sum, payment) => sum + payment.amount, 0);
  const paidUntilKeysPercent = offeredPrice > 0 ? (paidUntilKeys / offeredPrice) * 100 : 0;

  const monthlyRate = (rules?.present_value_monthly_rate ?? 0) / 100;
  const presentValue = schedule.reduce(
    (sum, payment) => sum + payment.amount / Math.pow(1 + monthlyRate, monthsBetween(input.referenceDate, payment.date)),
    0,
  );
  const effectiveDiscountPercent = listPrice > 0 ? ((listPrice - presentValue) / listPrice) * 100 : 0;

  const vgvImpact = offeredPrice - listPrice;
  const vgvImpactPercent =
    input.developmentTotalVgv && input.developmentTotalVgv > 0 ? (vgvImpact / input.developmentTotalVgv) * 100 : null;

  const checks: AnalysisCheck[] = [];
  checks.push(
    planMatches
      ? { key: "plan_total", label: "Fluxo fecha o valor ofertado", status: "pass", detail: `Fluxo soma ${brl(planTotal)}.` }
      : {
          key: "plan_total",
          label: "Fluxo fecha o valor ofertado",
          status: "fail",
          detail: items.length
            ? `Fluxo soma ${brl(planTotal)}, mas a oferta é ${brl(offeredPrice)}.`
            : "Cadastre o fluxo de pagamento.",
        },
  );

  if (rules?.max_discount_percent == null) {
    checks.push({ key: "discount", label: "Desconto sobre a tabela", status: "info", detail: `Desconto de ${pct(discountPercent)}%. Sem limite configurado.` });
  } else {
    checks.push({
      key: "discount",
      label: "Desconto sobre a tabela",
      status: discountPercent <= rules.max_discount_percent + 1e-9 ? "pass" : "fail",
      detail: `Desconto de ${pct(discountPercent)}% (máximo ${pct(rules.max_discount_percent)}%).`,
    });
  }

  if (rules?.present_value_monthly_rate == null) {
    checks.push({ key: "present_value", label: "Valor presente do fluxo", status: "info", detail: "Configure a taxa de desconto mensal para comparar o valor presente." });
  } else {
    const limit = rules.max_discount_percent;
    checks.push({
      key: "present_value",
      label: "Valor presente do fluxo",
      status: limit != null && effectiveDiscountPercent > limit + 1e-9 ? "warn" : "pass",
      detail: `Valor presente ${brl(presentValue)}: desconto efetivo de ${pct(effectiveDiscountPercent)}% sobre a tabela${limit != null ? ` (limite ${pct(limit)}%)` : ""}.`,
    });
  }

  if (rules?.min_down_payment_percent == null) {
    checks.push({ key: "down_payment", label: "Entrada mínima", status: "info", detail: `Entrada de ${pct(downPaymentPercent)}% (${brl(downPayment)}). Sem mínimo configurado.` });
  } else {
    checks.push({
      key: "down_payment",
      label: "Entrada mínima",
      status: downPaymentPercent + 1e-9 >= rules.min_down_payment_percent ? "pass" : "fail",
      detail: `Entrada de ${pct(downPaymentPercent)}% (mínimo ${pct(rules.min_down_payment_percent)}%).`,
    });
  }

  if (rules?.max_down_payment_installments == null) {
    checks.push({ key: "down_payment_installments", label: "Parcelas da entrada", status: "info", detail: `${downPaymentInstallments} parcela(s). Sem limite configurado.` });
  } else {
    checks.push({
      key: "down_payment_installments",
      label: "Parcelas da entrada",
      status: downPaymentInstallments <= rules.max_down_payment_installments ? "pass" : "fail",
      detail: `${downPaymentInstallments} parcela(s) (máximo ${rules.max_down_payment_installments}).`,
    });
  }

  if (rules?.min_paid_until_keys_percent == null) {
    checks.push({ key: "paid_until_keys", label: "Pago até as chaves", status: "info", detail: `${pct(paidUntilKeysPercent)}% pago até as chaves. Sem mínimo configurado.` });
  } else {
    const ok = paidUntilKeysPercent + 1e-9 >= rules.min_paid_until_keys_percent;
    checks.push({
      key: "paid_until_keys",
      label: "Pago até as chaves",
      status: ok ? (input.deliveryDate ? "pass" : "warn") : "fail",
      detail: `${pct(paidUntilKeysPercent)}% até as chaves (mínimo ${pct(rules.min_paid_until_keys_percent)}%).${input.deliveryDate ? "" : " Sem data de entrega no empreendimento: considerado todo o fluxo próprio."}`,
    });
  }

  const fails = checks.filter((check) => check.status === "fail").length;
  const warns = checks.filter((check) => check.status === "warn").length;
  const hasRules =
    rules != null &&
    [
      rules.max_discount_percent,
      rules.min_down_payment_percent,
      rules.max_down_payment_installments,
      rules.min_paid_until_keys_percent,
    ].some((value) => value != null);

  return {
    verdict: fails > 0 ? "outside_rules" : !hasRules ? "no_rules" : warns > 0 ? "attention" : "good",
    score: Math.max(0, Math.min(100, 100 - fails * 30 - warns * 10)),
    planTotal,
    discountPercent: round2(discountPercent),
    downPayment: round2(downPayment),
    downPaymentPercent: round2(downPaymentPercent),
    downPaymentInstallments,
    paidUntilKeys: round2(paidUntilKeys),
    paidUntilKeysPercent: round2(paidUntilKeysPercent),
    presentValue: round2(presentValue),
    effectiveDiscountPercent: round2(effectiveDiscountPercent),
    vgvImpact: round2(vgvImpact),
    vgvImpactPercent: vgvImpactPercent === null ? null : round2(vgvImpactPercent),
    checks,
  };
}

export type CommissionRole = "broker" | "manager" | "director" | "partner";

export const commissionRoleLabels: Record<CommissionRole, string> = {
  broker: "Corretor",
  manager: "Gerente",
  director: "Diretor",
  partner: "Imobiliária parceira",
};

export type CommissionResult = {
  total: number;
  percent: number;
  split: Array<{ role: CommissionRole; share: number; amount: number; active: boolean }>;
  unallocated: number;
  payments: Array<{ date: string; amount: number }>;
  rule: CommercialRules["commission_payment_rule"];
};

/** Distribui um total em partes proporcionais, corrigindo o arredondamento na última. */
function distribute(total: number, weights: number[]) {
  const sum = weights.reduce((acc, weight) => acc + weight, 0);
  if (sum <= 0) return weights.map(() => 0);
  const parts = weights.map((weight) => round2((total * weight) / sum));
  const diff = round2(total - parts.reduce((acc, part) => acc + part, 0));
  parts[parts.length - 1] = round2(parts[parts.length - 1] + diff);
  return parts;
}

/**
 * Comissão sobre o valor vendido.
 * - `upfront`: paga integral no primeiro vencimento do fluxo.
 * - `with_down_payment`: paga conforme o cliente paga sinal e entrada,
 *   proporcional a cada recebimento. Com limite de parcelas, os recebimentos
 *   são agrupados e a comissão de cada grupo é paga na data do último
 *   recebimento do grupo (nunca antes de o cliente pagar).
 */
export function calculateCommission(input: {
  rules: CommercialRules | null;
  offeredPrice: number;
  items: PaymentItem[];
  hasManager: boolean;
  hasDirector: boolean;
  hasPartner: boolean;
}): CommissionResult | null {
  const { rules } = input;
  if (!rules || rules.commission_percent == null) return null;
  const total = round2((input.offeredPrice * rules.commission_percent) / 100);

  const roles: Array<{ role: CommissionRole; share: number; active: boolean }> = [
    { role: "broker", share: rules.broker_share, active: true },
    { role: "manager", share: rules.manager_share, active: input.hasManager },
    { role: "director", share: rules.director_share, active: input.hasDirector },
    { role: "partner", share: rules.partner_share, active: input.hasPartner },
  ];
  const split = roles.map((item) => ({
    ...item,
    amount: item.active ? round2((total * item.share) / 100) : 0,
  }));
  const unallocated = round2(total - split.reduce((sum, item) => sum + item.amount, 0));

  const schedule = expandSchedule(input.items);
  let payments: Array<{ date: string; amount: number }> = [];
  const firstDate = schedule[0]?.date;
  const receipts = schedule.filter((payment) => DOWN_KINDS.includes(payment.kind));

  if (rules.commission_payment_rule === "upfront" || receipts.length === 0) {
    payments = firstDate ? [{ date: firstDate, amount: total }] : [];
  } else {
    const max = Math.max(1, rules.commission_max_installments ?? receipts.length);
    const groupCount = Math.min(max, receipts.length);
    const base = Math.floor(receipts.length / groupCount);
    const extra = receipts.length % groupCount;
    const groups: ScheduledPayment[][] = [];
    let cursor = 0;
    for (let index = 0; index < groupCount; index += 1) {
      const size = base + (index < extra ? 1 : 0);
      groups.push(receipts.slice(cursor, cursor + size));
      cursor += size;
    }
    const amounts = distribute(
      total,
      groups.map((group) => group.reduce((sum, payment) => sum + payment.amount, 0)),
    );
    payments = groups.map((group, index) => ({ date: group[group.length - 1].date, amount: amounts[index] }));
  }

  return { total, percent: rules.commission_percent, split, unallocated, payments, rule: rules.commission_payment_rule };
}

/** Converte a linha do banco (ou o snapshot JSON) em regras tipadas. */
export function toCommercialRules(value: unknown): CommercialRules | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const num = (key: string) => (row[key] === null || row[key] === undefined ? null : Number(row[key]));
  return {
    max_discount_percent: num("max_discount_percent"),
    min_down_payment_percent: num("min_down_payment_percent"),
    max_down_payment_installments: num("max_down_payment_installments"),
    min_paid_until_keys_percent: num("min_paid_until_keys_percent"),
    present_value_monthly_rate: num("present_value_monthly_rate"),
    commission_percent: num("commission_percent"),
    broker_share: num("broker_share") ?? 0,
    manager_share: num("manager_share") ?? 0,
    director_share: num("director_share") ?? 0,
    partner_share: num("partner_share") ?? 0,
    commission_payment_rule: row.commission_payment_rule === "upfront" ? "upfront" : "with_down_payment",
    commission_max_installments: num("commission_max_installments"),
  };
}
