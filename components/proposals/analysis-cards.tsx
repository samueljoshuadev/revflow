import { AlertTriangle, BadgePercent, CheckCircle2, Info, Scale, XCircle } from "lucide-react";

import {
  commissionRoleLabels,
  type AnalysisCheck,
  type CommissionResult,
  type ProposalAnalysis,
} from "@/lib/proposal-analysis";
import { cn, formatCurrency } from "@/lib/utils";

const verdictStyles: Record<ProposalAnalysis["verdict"], { label: string; className: string; hint: string }> = {
  good: { label: "Boa proposta", className: "bg-emerald-600 text-white", hint: "Dentro de todas as regras da incorporadora." },
  attention: { label: "Atenção", className: "bg-amber-500 text-white", hint: "Dentro das regras, mas com pontos a avaliar." },
  outside_rules: { label: "Fora das regras", className: "bg-red-600 text-white", hint: "Descumpre ao menos uma regra da incorporadora." },
  no_rules: { label: "Sem regras", className: "bg-gray-500 text-white", hint: "A incorporadora ainda não configurou limites para este empreendimento." },
};

const checkIcons: Record<AnalysisCheck["status"], { icon: typeof CheckCircle2; className: string }> = {
  pass: { icon: CheckCircle2, className: "text-emerald-600" },
  warn: { icon: AlertTriangle, className: "text-amber-500" },
  fail: { icon: XCircle, className: "text-red-600" },
  info: { icon: Info, className: "text-gray-400" },
};

const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const pct = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

export function AnalysisCard({ analysis, usingSnapshot }: { analysis: ProposalAnalysis; usingSnapshot: boolean }) {
  const verdict = verdictStyles[analysis.verdict];
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><Scale className="size-4 text-brand-dark" /> Análise da proposta</h2>
        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", verdict.className)}>{verdict.label}</span>
      </div>
      <p className="mt-1 text-[11px] text-gray-500">
        {verdict.hint} {usingSnapshot ? "Regras vigentes no envio." : "Regras atuais do empreendimento."}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-2">
        <Stat label="Desconto s/ tabela" value={pct(analysis.discountPercent)} />
        <Stat label="Entrada" value={`${pct(analysis.downPaymentPercent)} · ${analysis.downPaymentInstallments}x`} />
        <Stat label="Até as chaves" value={pct(analysis.paidUntilKeysPercent)} />
        <Stat label="Valor presente" value={formatCurrency(analysis.presentValue)} />
        <div className="col-span-2 rounded-lg bg-gray-50 px-3 py-2">
          <dt className="text-[10px] font-medium tracking-wide text-gray-500 uppercase">Impacto no VGV</dt>
          <dd className={cn("mt-0.5 text-sm font-semibold", analysis.vgvImpact < 0 ? "text-amber-700" : "text-emerald-700")}>
            {analysis.vgvImpact > 0 ? "+" : ""}{formatCurrency(analysis.vgvImpact)}
            {analysis.vgvImpactPercent !== null && <span className="ml-1 text-[11px] font-normal text-gray-500">({pct(analysis.vgvImpactPercent)} do VGV do empreendimento)</span>}
          </dd>
        </div>
      </dl>

      <ul className="mt-4 space-y-2">
        {analysis.checks.map((check) => {
          const { icon: Icon, className } = checkIcons[check.status];
          return (
            <li key={check.key} className="flex gap-2 text-xs">
              <Icon className={cn("mt-0.5 size-3.5 shrink-0", className)} />
              <span><span className="font-medium text-gray-900">{check.label}.</span> <span className="text-gray-600">{check.detail}</span></span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function CommissionCard({
  commission,
  names,
}: {
  commission: CommissionResult | null;
  names: Partial<Record<keyof typeof commissionRoleLabels, string | null>>;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><BadgePercent className="size-4 text-brand-dark" /> Comissão</h2>
      {!commission ? (
        <p className="mt-3 text-xs text-gray-500">A incorporadora ainda não configurou a comissão deste empreendimento.</p>
      ) : (
        <>
          <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-gray-950">{formatCurrency(commission.total)}</p>
          <p className="text-[11px] text-gray-500">
            {pct(commission.percent)} do valor vendido ·{" "}
            {commission.rule === "upfront" ? "paga de uma vez" : "paga conforme o cliente paga sinal e entrada"}
          </p>
          <ul className="mt-4 space-y-1.5 text-xs">
            {commission.split.filter((item) => item.share > 0).map((item) => (
              <li key={item.role} className={cn("flex justify-between gap-3", !item.active && "text-gray-400")}>
                <span>
                  {commissionRoleLabels[item.role]} ({pct(item.share)})
                  {item.active && names[item.role] ? <span className="text-gray-500"> · {names[item.role]}</span> : null}
                  {!item.active && " · sem vínculo"}
                </span>
                <span className="font-medium">{formatCurrency(item.amount)}</span>
              </li>
            ))}
            {commission.unallocated > 0 && (
              <li className="flex justify-between gap-3 border-t border-gray-100 pt-1.5 text-gray-500">
                <span>Não alocado (fica com a empresa)</span>
                <span className="font-medium">{formatCurrency(commission.unallocated)}</span>
              </li>
            )}
          </ul>
          {commission.payments.length > 0 && (
            <>
              <h3 className="mt-4 text-[11px] font-semibold tracking-wide text-gray-500 uppercase">Parcelas da comissão</h3>
              <ol className="mt-2 space-y-1 text-xs">
                {commission.payments.map((payment, index) => (
                  <li key={`${payment.date}-${index}`} className="flex justify-between gap-3">
                    <span className="text-gray-600">{index + 1}ª · {date.format(new Date(`${payment.date}T00:00:00Z`))}</span>
                    <span className="font-medium text-gray-900">{formatCurrency(payment.amount)}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <dt className="text-[10px] font-medium tracking-wide text-gray-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-gray-900">{value}</dd>
    </div>
  );
}
