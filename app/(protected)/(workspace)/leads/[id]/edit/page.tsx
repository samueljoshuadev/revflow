import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { getLeadDetail, getLeadFormOptions } from "@/services/leads";
import { requireWorkspace } from "@/services/workspace";

import { updateLead } from "../../actions";

export const metadata = { title: "Editar lead" };

export default async function EditLeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { organization } = await requireWorkspace();
  const [lead, options] = await Promise.all([
    getLeadDetail(organization.id, id),
    getLeadFormOptions(organization.id),
  ]);
  if (!lead) notFound();
  const selectedTags = new Set(lead.tags.map((tag) => tag.id));

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <Link
        href={`/leads/${lead.id}`}
        className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="size-3.5" /> Voltar ao lead
      </Link>
      <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-7">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
          Editar lead
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Alterações comerciais são auditadas e registradas na timeline.
        </p>
        {query.error && (
          <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {query.error}
          </p>
        )}

        <form action={updateLead} className="mt-7 space-y-6">
          <input type="hidden" name="leadId" value={lead.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" name="name" defaultValue={lead.name} required />
            <Field
              label="Empresa"
              name="company"
              defaultValue={lead.company ?? ""}
            />
            <Field
              label="E-mail"
              name="email"
              type="email"
              defaultValue={lead.email ?? ""}
            />
            <Field
              label="Telefone"
              name="phone"
              defaultValue={lead.phone ?? ""}
            />
            <div>
              <Label htmlFor="serviceId">Serviço</Label>
              <Select
                id="serviceId"
                name="serviceId"
                defaultValue={lead.service_id ?? ""}
              >
                <option value="">Não informado</option>
                {options.services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="ownerId">Responsável</Label>
              <Select
                id="ownerId"
                name="ownerId"
                defaultValue={lead.owner_id ?? ""}
              >
                <option value="">Sem responsável</option>
                {options.members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.profile?.full_name ?? "Membro"}
                  </option>
                ))}
              </Select>
            </div>
            <Field
              label="Origem"
              name="source"
              defaultValue={lead.source ?? ""}
            />
            <Field
              label="Campanha"
              name="campaign"
              defaultValue={lead.campaign ?? ""}
            />
            <Field
              label="Orçamento estimado"
              name="estimatedBudget"
              type="number"
              min={0}
              step="0.01"
              defaultValue={lead.estimated_budget ?? ""}
            />
            <div>
              <Label htmlFor="priority">Prioridade</Label>
              <Select
                id="priority"
                name="priority"
                defaultValue={lead.priority}
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </Select>
            </div>
            <Field
              label="Score (0–100)"
              name="score"
              type="number"
              min={0}
              max={100}
              defaultValue={lead.score}
              required
            />
            <Field
              label="Próxima ação"
              name="nextAction"
              defaultValue={lead.next_action ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="summary">Resumo</Label>
            <Textarea
              id="summary"
              name="summary"
              rows={4}
              maxLength={2000}
              defaultValue={lead.summary ?? ""}
            />
          </div>
          <fieldset>
            <legend className="text-xs font-medium text-gray-700">Tags</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {options.tags.length === 0 ? (
                <p className="text-xs text-gray-400">
                  Crie tags pela API ou futura gestão de tags.
                </p>
              ) : (
                options.tags.map((tag) => (
                  <label
                    key={tag.id}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-600"
                  >
                    <input
                      type="checkbox"
                      name="tagIds"
                      value={tag.id}
                      defaultChecked={selectedTags.has(tag.id)}
                      className="accent-violet-600"
                    />
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </label>
                ))
              )}
            </div>
          </fieldset>
          <div className="flex justify-end">
            <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-gray-950 px-4 text-sm font-medium text-white hover:bg-gray-800">
              <Save className="size-4" /> Salvar alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; name: string }) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}
