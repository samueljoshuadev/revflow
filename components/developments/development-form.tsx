import { Building, Calculator } from "lucide-react";

import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { developmentStageLabels } from "@/lib/developments";
import type { Tables } from "@/types/database";

type DevelopmentFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  development?: Tables<"developments">;
  submitLabel: string;
};

const decimal = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);

export function DevelopmentForm({ action, development, submitLabel }: DevelopmentFormProps) {
  return (
    <form action={action} className="space-y-5">
      {development && <input type="hidden" name="developmentId" value={development.id} />}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
        <SectionTitle icon={Building} title="Empreendimento" description="Dados que aparecem para toda a equipe no espelho." />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <Field label="Nome do empreendimento" name="name" defaultValue={development?.name} required minLength={2} maxLength={180} />
          </div>
          <Field label="Incorporadora" name="developerName" defaultValue={development?.developer_name ?? ""} maxLength={180} />
          <div>
            <Label htmlFor="stage">Fase</Label>
            <Select id="stage" name="stage" defaultValue={development?.stage ?? "launch"}>
              {Object.entries(developmentStageLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
          <Field label="Cidade" name="city" defaultValue={development?.city} required minLength={2} maxLength={120} />
          <Field label="Bairro" name="neighborhood" defaultValue={development?.neighborhood ?? ""} maxLength={120} />
          <Field label="Endereço" name="address" defaultValue={development?.address ?? ""} maxLength={300} />
          <Field label="Previsão de entrega" name="deliveryDate" type="date" defaultValue={development?.delivery_date ?? ""} />
          <div className="sm:col-span-2 lg:col-span-4">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" rows={3} maxLength={5000} defaultValue={development?.description ?? ""} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
        <SectionTitle
          icon={Calculator}
          title="Regras do simulador"
          description="Usadas no cálculo automático de parcela e renda. Deixe a taxa em branco se não houver uma padrão: o corretor informa na hora."
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Juros (% ao ano)" name="financingAnnualRate" type="number" step="0.001" min={0} max={60} defaultValue={decimal(development?.financing_annual_rate)} />
          <Field label="Prazo máximo (meses)" name="financingMaxTermMonths" type="number" min={1} max={480} defaultValue={decimal(development?.financing_max_term_months)} />
          <Field label="Financiamento máx. (% do valor)" name="financingMaxLtv" type="number" step="0.01" min={1} max={100} defaultValue={decimal(development?.financing_max_ltv)} />
          <Field label="Comprometimento de renda (%)" name="incomeCommitmentLimit" type="number" step="0.01" min={1} max={100} defaultValue={decimal(development?.income_commitment_limit ?? 30)} required />
        </div>
      </section>

      <div className="flex justify-end">
        <button className="h-10 rounded-lg bg-brand px-5 text-sm font-semibold text-[#172033] shadow-sm hover:bg-brand-dark hover:text-white">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function SectionTitle({ icon: Icon, title, description }: { icon: typeof Building; title: string; description: string }) {
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

export function Field({
  label,
  name,
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const inputId = id ?? name;
  return (
    <div>
      <Label htmlFor={inputId}>{label}</Label>
      <Input id={inputId} name={name} {...props} />
    </div>
  );
}
