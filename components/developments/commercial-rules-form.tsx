import { BadgePercent, Scale } from "lucide-react";

import { Field } from "@/components/developments/development-form";
import { Label, Select } from "@/components/ui/field";
import type { Tables } from "@/types/database";

const value = (input: number | null | undefined) => (input === null || input === undefined ? "" : String(input));

export function CommercialRulesForm({
  developmentId,
  rules,
  action,
}: {
  developmentId: string;
  rules: Tables<"development_commercial_rules"> | null;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="developmentId" value={developmentId} />
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
        <Title icon={Scale} title="Limites da proposta" description="Usados pelo analisador para dizer se a proposta é boa. Campo vazio = sem limite." />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Desconto máximo (%)" name="maxDiscountPercent" id="rules-discount" type="number" step="0.01" min={0} max={100} defaultValue={value(rules?.max_discount_percent)} />
          <Field label="Entrada mínima (%)" name="minDownPaymentPercent" id="rules-down" type="number" step="0.01" min={0} max={100} defaultValue={value(rules?.min_down_payment_percent)} />
          <Field label="Máx. parcelas da entrada" name="maxDownPaymentInstallments" id="rules-down-installments" type="number" min={1} max={120} defaultValue={value(rules?.max_down_payment_installments)} />
          <Field label="Mín. pago até as chaves (%)" name="minPaidUntilKeysPercent" id="rules-keys" type="number" step="0.01" min={0} max={100} defaultValue={value(rules?.min_paid_until_keys_percent)} />
          <Field label="Taxa p/ valor presente (% a.m.)" name="presentValueMonthlyRate" id="rules-pv" type="number" step="0.0001" min={0} max={10} defaultValue={value(rules?.present_value_monthly_rate)} />
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
        <Title icon={BadgePercent} title="Comissão" description="Percentual sobre o valor vendido e divisão entre os envolvidos (soma até 100%). Parte sem vínculo na proposta fica com a empresa." />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Comissão total (%)" name="commissionPercent" id="rules-commission" type="number" step="0.01" min={0} max={30} defaultValue={value(rules?.commission_percent)} />
          <div>
            <Label htmlFor="rules-payment-rule">Pagamento da comissão</Label>
            <Select id="rules-payment-rule" name="commissionPaymentRule" defaultValue={rules?.commission_payment_rule ?? "with_down_payment"}>
              <option value="with_down_payment">Conforme o cliente paga a entrada</option>
              <option value="upfront">De uma vez, no primeiro pagamento</option>
            </Select>
          </div>
          <Field label="Máx. parcelas da comissão" name="commissionMaxInstallments" id="rules-commission-installments" type="number" min={1} max={120} defaultValue={value(rules?.commission_max_installments)} />
          <div />
          <Field label="Corretor (% da comissão)" name="brokerShare" id="rules-broker" type="number" step="0.01" min={0} max={100} defaultValue={value(rules?.broker_share ?? 0)} />
          <Field label="Gerente (%)" name="managerShare" id="rules-manager" type="number" step="0.01" min={0} max={100} defaultValue={value(rules?.manager_share ?? 0)} />
          <Field label="Diretor (%)" name="directorShare" id="rules-director" type="number" step="0.01" min={0} max={100} defaultValue={value(rules?.director_share ?? 0)} />
          <Field label="Imobiliária parceira (%)" name="partnerShare" id="rules-partner" type="number" step="0.01" min={0} max={100} defaultValue={value(rules?.partner_share ?? 0)} />
        </div>
      </section>

      <div className="flex justify-end">
        <button className="h-10 rounded-lg bg-brand px-5 text-sm font-semibold text-[#172033] shadow-sm hover:bg-brand-dark hover:text-white">Salvar regras comerciais</button>
      </div>
    </form>
  );
}

function Title({ icon: Icon, title, description }: { icon: typeof Scale; title: string; description: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand-dark"><Icon className="size-4" /></span>
      <div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <p className="mt-0.5 text-xs text-gray-400">{description}</p>
      </div>
    </div>
  );
}
