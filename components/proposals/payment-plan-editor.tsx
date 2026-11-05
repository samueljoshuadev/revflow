"use client";

import { Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useId, useState } from "react";

import { Input, Select } from "@/components/ui/field";
import { addMonths, paymentKindLabels, type PaymentKind } from "@/lib/proposal-analysis";

type Row = {
  key: string;
  kind: PaymentKind;
  installment_count: string;
  installment_amount: string;
  first_due_date: string;
  interval_months: string;
};

type PaymentPlanEditorProps = {
  proposalId: string;
  offeredPrice: number;
  initialItems: Array<{
    kind: PaymentKind;
    installment_count: number;
    installment_amount: number;
    first_due_date: string;
    interval_months: number;
  }>;
  minDownPaymentPercent: number | null;
  deliveryDate: string | null;
  action: (formData: FormData) => void | Promise<void>;
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const today = () => new Date().toISOString().slice(0, 10);
let keySeed = 0;
const nextKey = () => `row-${(keySeed += 1)}`;

function toNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const normalized = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rowTotal(row: Row) {
  return Math.round(toNumber(row.installment_count) * toNumber(row.installment_amount) * 100) / 100;
}

function makeRow(kind: PaymentKind, amount: number, date: string, count = 1, interval = 1): Row {
  return {
    key: nextKey(),
    kind,
    installment_count: String(count),
    installment_amount: amount.toFixed(2),
    first_due_date: date,
    interval_months: String(interval),
  };
}

export function PaymentPlanEditor({
  proposalId,
  offeredPrice,
  initialItems,
  minDownPaymentPercent,
  deliveryDate,
  action,
}: PaymentPlanEditorProps) {
  const id = useId();
  const [rows, setRows] = useState<Row[]>(() =>
    initialItems.map((item) => ({
      key: nextKey(),
      kind: item.kind,
      installment_count: String(item.installment_count),
      installment_amount: Number(item.installment_amount).toFixed(2),
      first_due_date: item.first_due_date,
      interval_months: String(item.interval_months),
    })),
  );

  const total = Math.round(rows.reduce((sum, row) => sum + rowTotal(row), 0) * 100) / 100;
  const difference = Math.round((offeredPrice - total) * 100) / 100;
  const keysDate = deliveryDate ?? addMonths(today(), 12);

  const update = (key: string, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const suggest = () => {
    const downPercent = minDownPaymentPercent ?? 10;
    const signal = Math.round(offeredPrice * (downPercent / 100) * 100) / 100;
    setRows([
      makeRow("signal", signal, today()),
      makeRow("financing", Math.round((offeredPrice - signal) * 100) / 100, keysDate),
    ]);
  };

  const closeWithFinancing = () => {
    if (difference === 0) return;
    const existing = rows.find((row) => row.kind === "financing" && toNumber(row.installment_count) === 1);
    if (existing) {
      const amount = Math.round((toNumber(existing.installment_amount) + difference) * 100) / 100;
      if (amount > 0) update(existing.key, { installment_amount: amount.toFixed(2) });
    } else if (difference > 0) {
      setRows((current) => [...current, makeRow("financing", difference, keysDate)]);
    }
  };

  const payload = JSON.stringify(
    rows.map((row) => ({
      kind: row.kind,
      installment_count: Math.trunc(toNumber(row.installment_count)),
      installment_amount: toNumber(row.installment_amount),
      first_due_date: row.first_due_date,
      interval_months: Math.trunc(toNumber(row.interval_months)) || 1,
    })),
  );

  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="proposalId" value={proposalId} />
      <input type="hidden" name="items" value={payload} />

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-5 text-center">
          <p className="text-xs text-gray-500">Nenhuma parcela ainda.</p>
          <button type="button" onClick={suggest} className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-4 text-xs font-semibold text-[#172033] hover:bg-brand-dark hover:text-white">
            <Sparkles className="size-3.5" /> Usar sugestão (sinal {minDownPaymentPercent ?? 10}% + financiamento)
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-xs">
            <thead className="text-left text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
              <tr>
                <th className="pb-1.5">Tipo</th>
                <th className="pb-1.5">Qtd.</th>
                <th className="pb-1.5">Valor da parcela</th>
                <th className="pb-1.5">1º vencimento</th>
                <th className="pb-1.5">A cada (meses)</th>
                <th className="pb-1.5 text-right">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.key} className="align-top">
                  <td className="py-1 pr-2">
                    <Select aria-label={`Tipo da linha ${index + 1}`} value={row.kind} onChange={(event) => update(row.key, { kind: event.target.value as PaymentKind })} className="h-9 text-xs">
                      {Object.entries(paymentKindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </Select>
                  </td>
                  <td className="py-1 pr-2"><Input aria-label={`Quantidade da linha ${index + 1}`} inputMode="numeric" value={row.installment_count} onChange={(event) => update(row.key, { installment_count: event.target.value })} className="h-9 w-16 text-xs" /></td>
                  <td className="py-1 pr-2"><Input aria-label={`Valor da linha ${index + 1}`} inputMode="decimal" value={row.installment_amount} onChange={(event) => update(row.key, { installment_amount: event.target.value })} className="h-9 w-32 text-xs" /></td>
                  <td className="py-1 pr-2"><Input aria-label={`Vencimento da linha ${index + 1}`} type="date" value={row.first_due_date} onChange={(event) => update(row.key, { first_due_date: event.target.value })} className="h-9 text-xs" /></td>
                  <td className="py-1 pr-2"><Input aria-label={`Intervalo da linha ${index + 1}`} inputMode="numeric" value={row.interval_months} onChange={(event) => update(row.key, { interval_months: event.target.value })} className="h-9 w-16 text-xs" /></td>
                  <td className="py-1 pr-2 pt-3 text-right font-medium whitespace-nowrap text-gray-900">{brl.format(rowTotal(row))}</td>
                  <td className="py-1 pt-2">
                    <button type="button" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remover linha ${index + 1}`}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setRows((current) => [...current, makeRow("monthly", 0, today())])} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50">
            <Plus className="size-3.5" /> Linha
          </button>
          {rows.length > 0 && difference !== 0 && (
            <button type="button" onClick={closeWithFinancing} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50">
              <Wand2 className="size-3.5" /> Fechar diferença no financiamento
            </button>
          )}
        </div>
        <p id={`${id}-total`} className={`text-xs font-semibold ${difference === 0 ? "text-emerald-700" : "text-amber-700"}`}>
          {brl.format(total)} de {brl.format(offeredPrice)}
          {difference !== 0 && ` · ${difference > 0 ? "faltam" : "sobram"} ${brl.format(Math.abs(difference))}`}
        </p>
      </div>

      <button disabled={rows.length === 0} aria-describedby={`${id}-total`} className="h-9 w-full rounded-lg bg-[#172033] text-xs font-semibold text-white hover:bg-black disabled:opacity-40">
        Salvar fluxo de pagamento
      </button>
    </form>
  );
}
