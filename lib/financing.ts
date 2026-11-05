/**
 * Simulador de financiamento imobiliário (SAC e Price).
 *
 * Estimativa comercial: não inclui seguros (MIP/DFI), taxa de administração,
 * TR ou correção monetária, e não substitui a análise de crédito do banco.
 * Função pura e determinística, usada no cliente e testada isoladamente.
 */

export type AmortizationSystem = "sac" | "price";

export type FinancingInput = {
  /** Valor do imóvel/unidade. */
  propertyPrice: number;
  /** Entrada em dinheiro (sem FGTS). */
  downPayment: number;
  /** Saldo de FGTS usado para abater do valor financiado. */
  fgts: number;
  /** Taxa de juros efetiva anual, em % (ex.: 10.5). */
  annualRatePercent: number;
  termMonths: number;
  system: AmortizationSystem;
  /** Renda bruta mensal familiar (opcional). */
  grossMonthlyIncome?: number | null;
  /** Comprometimento máximo de renda, em % (padrão de mercado: 30). */
  incomeCommitmentLimitPercent: number;
  /** Percentual máximo financiável do valor do imóvel (opcional). */
  maxLtvPercent?: number | null;
};

export type FinancingWarning =
  | "no_financing_needed"
  | "ltv_exceeded"
  | "income_insufficient"
  | "down_payment_exceeds_price";

export type FinancingResult = {
  financedAmount: number;
  monthlyRate: number;
  firstInstallment: number;
  lastInstallment: number;
  totalPaid: number;
  totalInterest: number;
  /** % do valor do imóvel que está sendo financiado. */
  ltvPercent: number;
  /** Renda mínima para a 1ª parcela caber no limite de comprometimento. */
  minimumIncome: number;
  /** % da renda comprometida pela 1ª parcela (quando a renda foi informada). */
  incomeCommitmentPercent: number | null;
  /** Entrada + FGTS mínimos para respeitar o LTV máximo (quando configurado). */
  minimumOwnResources: number | null;
  warnings: FinancingWarning[];
};

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function annualToMonthlyRate(annualRatePercent: number) {
  return Math.pow(1 + annualRatePercent / 100, 1 / 12) - 1;
}

/** Parcela fixa da tabela Price. */
export function priceInstallment(principal: number, monthlyRate: number, termMonths: number) {
  if (principal <= 0) return 0;
  if (monthlyRate === 0) return principal / termMonths;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));
}

export function simulateFinancing(input: FinancingInput): FinancingResult {
  const price = Math.max(0, input.propertyPrice);
  const ownResources = Math.max(0, input.downPayment) + Math.max(0, input.fgts);
  const financed = Math.max(0, price - ownResources);
  const term = Math.max(1, Math.floor(input.termMonths));
  const monthlyRate = annualToMonthlyRate(Math.max(0, input.annualRatePercent));
  const warnings: FinancingWarning[] = [];

  if (ownResources > price) warnings.push("down_payment_exceeds_price");

  let firstInstallment = 0;
  let lastInstallment = 0;
  let totalPaid = 0;

  if (financed > 0) {
    if (input.system === "price") {
      const installment = priceInstallment(financed, monthlyRate, term);
      firstInstallment = installment;
      lastInstallment = installment;
      totalPaid = installment * term;
    } else {
      const amortization = financed / term;
      firstInstallment = amortization + financed * monthlyRate;
      // Saldo antes da última parcela = uma amortização.
      lastInstallment = amortization + amortization * monthlyRate;
      // Soma dos juros SAC: i * A * (n + (n-1) + ... + 1) = i * A * n(n+1)/2.
      const totalInterest = monthlyRate * amortization * ((term * (term + 1)) / 2);
      totalPaid = financed + totalInterest;
    }
  } else {
    warnings.push("no_financing_needed");
  }

  const ltvPercent = price > 0 ? (financed / price) * 100 : 0;
  let minimumOwnResources: number | null = null;
  if (input.maxLtvPercent != null) {
    minimumOwnResources = round2(price * (1 - input.maxLtvPercent / 100));
    if (ltvPercent > input.maxLtvPercent + 1e-9) warnings.push("ltv_exceeded");
  }

  const limit = Math.max(1, input.incomeCommitmentLimitPercent) / 100;
  const minimumIncome = firstInstallment / limit;
  let incomeCommitmentPercent: number | null = null;
  if (input.grossMonthlyIncome != null && input.grossMonthlyIncome > 0) {
    incomeCommitmentPercent = (firstInstallment / input.grossMonthlyIncome) * 100;
    if (firstInstallment > input.grossMonthlyIncome * limit + 1e-9) {
      warnings.push("income_insufficient");
    }
  }

  return {
    financedAmount: round2(financed),
    monthlyRate,
    firstInstallment: round2(firstInstallment),
    lastInstallment: round2(lastInstallment),
    totalPaid: round2(totalPaid),
    totalInterest: round2(Math.max(0, totalPaid - financed)),
    ltvPercent: round2(ltvPercent),
    minimumIncome: round2(minimumIncome),
    incomeCommitmentPercent:
      incomeCommitmentPercent === null ? null : round2(incomeCommitmentPercent),
    minimumOwnResources,
    warnings,
  };
}
