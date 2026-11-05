"use client";

import { AlertTriangle, Calculator, CheckCircle2 } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { Input, Label, Select } from "@/components/ui/field";
import {
  simulateFinancing,
  type AmortizationSystem,
  type FinancingWarning,
} from "@/lib/financing";

type FinancingSimulatorProps = {
  propertyPrice: number;
  annualRatePercent: number | null;
  maxTermMonths: number | null;
  maxLtvPercent: number | null;
  incomeCommitmentLimitPercent: number;
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const pct = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** Converte "1.234,56" ou "1234.56" em número; vazio vira null. */
function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

const warningText: Record<FinancingWarning, string> = {
  no_financing_needed: "Entrada e FGTS cobrem o valor da unidade: não há saldo a financiar.",
  down_payment_exceeds_price: "Entrada + FGTS estão acima do valor da unidade.",
  ltv_exceeded: "O valor financiado passa do limite permitido para este empreendimento.",
  income_insufficient: "A parcela inicial compromete mais renda do que o limite configurado.",
};

export function FinancingSimulator({
  propertyPrice,
  annualRatePercent,
  maxTermMonths,
  maxLtvPercent,
  incomeCommitmentLimitPercent,
}: FinancingSimulatorProps) {
  const id = useId();
  const [downPayment, setDownPayment] = useState("");
  const [fgts, setFgts] = useState("");
  const [income, setIncome] = useState("");
  const [rate, setRate] = useState(annualRatePercent === null ? "" : String(annualRatePercent).replace(".", ","));
  const [term, setTerm] = useState(String(maxTermMonths ?? 360));
  const [system, setSystem] = useState<AmortizationSystem>("sac");

  const parsedRate = parseAmount(rate);
  const parsedTerm = Number.parseInt(term, 10);
  const termValid = Number.isInteger(parsedTerm) && parsedTerm >= 1 && parsedTerm <= (maxTermMonths ?? 480);

  const result = useMemo(() => {
    if (parsedRate === null || parsedRate > 60 || !termValid) return null;
    return simulateFinancing({
      propertyPrice,
      downPayment: parseAmount(downPayment) ?? 0,
      fgts: parseAmount(fgts) ?? 0,
      annualRatePercent: parsedRate,
      termMonths: parsedTerm,
      system,
      grossMonthlyIncome: parseAmount(income),
      incomeCommitmentLimitPercent,
      maxLtvPercent,
    });
  }, [propertyPrice, downPayment, fgts, parsedRate, termValid, parsedTerm, system, income, incomeCommitmentLimitPercent, maxLtvPercent]);

  const visibleWarnings = result?.warnings.filter((warning) => warning !== "down_payment_exceeds_price" || !result.warnings.includes("no_financing_needed")) ?? [];

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand-dark"><Calculator className="size-4" /></span>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Simulador de financiamento</h3>
          <p className="text-[11px] text-gray-400">Valor da unidade: {brl.format(propertyPrice)}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <AmountField id={`${id}-down`} label="Entrada (R$)" value={downPayment} onChange={setDownPayment} />
        <AmountField id={`${id}-fgts`} label="FGTS (R$)" value={fgts} onChange={setFgts} />
        <AmountField id={`${id}-income`} label="Renda familiar (R$)" value={income} onChange={setIncome} placeholder="Opcional" />
        <div>
          <Label htmlFor={`${id}-system`}>Sistema</Label>
          <Select id={`${id}-system`} value={system} onChange={(event) => setSystem(event.target.value as AmortizationSystem)}>
            <option value="sac">SAC (parcela cai)</option>
            <option value="price">Price (parcela fixa)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor={`${id}-rate`}>Juros (% ao ano)</Label>
          <Input id={`${id}-rate`} inputMode="decimal" value={rate} onChange={(event) => setRate(event.target.value)} placeholder="Ex.: 10,5" />
        </div>
        <div>
          <Label htmlFor={`${id}-term`}>Prazo (meses)</Label>
          <Input id={`${id}-term`} inputMode="numeric" value={term} onChange={(event) => setTerm(event.target.value)} />
        </div>
      </div>

      {parsedRate === null ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {annualRatePercent === null
            ? "A taxa de juros não está configurada neste empreendimento. Informe a taxa do banco para simular."
            : "Informe uma taxa de juros válida."}
        </p>
      ) : !termValid ? (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Informe um prazo entre 1 e {maxTermMonths ?? 480} meses.
        </p>
      ) : result ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Valor financiado" value={brl.format(result.financedAmount)} hint={`${pct.format(result.ltvPercent)}% do imóvel`} />
            <Stat
              label={system === "sac" ? "1ª parcela" : "Parcela"}
              value={brl.format(result.firstInstallment)}
              hint={system === "sac" ? `última: ${brl.format(result.lastInstallment)}` : `${parsedTerm} meses`}
              highlight
            />
            <Stat label="Renda mínima" value={brl.format(result.minimumIncome)} hint={`parcela até ${pct.format(incomeCommitmentLimitPercent)}% da renda`} />
            <Stat label="Juros no período" value={brl.format(result.totalInterest)} hint={`total pago: ${brl.format(result.totalPaid)}`} />
          </div>
          {result.incomeCommitmentPercent !== null && (
            <p className="text-xs text-gray-500">
              A 1ª parcela compromete <strong className="text-gray-800">{pct.format(result.incomeCommitmentPercent)}%</strong> da renda informada.
            </p>
          )}
          {result.minimumOwnResources !== null && (
            <p className="text-xs text-gray-500">
              Entrada + FGTS mínimos para este empreendimento: <strong className="text-gray-800">{brl.format(result.minimumOwnResources)}</strong>.
            </p>
          )}
          {visibleWarnings.length > 0 ? (
            <ul className="space-y-1.5">
              {visibleWarnings.map((warning) => (
                <li key={warning} className="flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />{warningText[warning]}
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              <CheckCircle2 className="size-3.5" /> Simulação dentro dos limites configurados.
            </p>
          )}
          <p className="text-[10px] leading-4 text-gray-400">
            Estimativa sem seguros (MIP/DFI), taxas e correção (TR). Não substitui a análise de crédito do banco.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function AmountField({
  id,
  label,
  value,
  onChange,
  placeholder = "0,00",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Stat({ label, value, hint, highlight }: { label: string; value: string; hint: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${highlight ? "border-brand/40 bg-brand-soft" : "border-gray-100 bg-gray-50"}`}>
      <p className="text-[10px] font-medium tracking-wide text-gray-500 uppercase">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-950">{value}</p>
      <p className="mt-0.5 text-[10px] text-gray-500">{hint}</p>
    </div>
  );
}
