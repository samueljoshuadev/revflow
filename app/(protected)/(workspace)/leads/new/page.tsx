import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { getLeadFormOptions } from "@/services/leads";
import { requireWorkspace } from "@/services/workspace";

import { createLead } from "../actions";

export const metadata = { title: "Novo lead" };

export default async function NewLeadPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { organization } = await requireWorkspace();
  const options = await getLeadFormOptions(organization.id);

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 lg:p-8">
      <Link
        href="/leads"
        className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="size-3.5" /> Voltar para leads
      </Link>
      <div className="mt-5">
        <h1 className="text-2xl font-semibold tracking-[-0.035em] text-gray-950">
          Novo lead
        </h1>
        <p className="mt-1.5 text-sm text-gray-500">
          Registre a oportunidade e defina a próxima ação comercial.
        </p>
      </div>

      {error && (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={createLead} className="mt-7 space-y-5">
        <section className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs sm:p-6">
          <h2 className="text-sm font-semibold text-gray-900">
            Dados principais
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Nome do contato"
                maxLength={160}
                required
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="company">Empresa</Label>
              <Input
                id="company"
                name="company"
                placeholder="Empresa ou marca"
                maxLength={160}
              />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="contato@empresa.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                maxLength={40}
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs sm:p-6">
          <h2 className="text-sm font-semibold text-gray-900">Oportunidade</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="serviceId">Serviço de interesse</Label>
              <Select id="serviceId" name="serviceId" defaultValue="">
                <option value="">Selecione um serviço</option>
                {options.services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="estimatedBudget">Orçamento estimado</Label>
              <Input
                id="estimatedBudget"
                name="estimatedBudget"
                type="number"
                min="0"
                step="0.01"
                placeholder="5000"
              />
            </div>
            <div>
              <Label htmlFor="stageId">Etapa inicial *</Label>
              <Select
                id="stageId"
                name="stageId"
                defaultValue={options.stages[0]?.id}
                required
              >
                {options.stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Prioridade</Label>
              <Select id="priority" name="priority" defaultValue="medium">
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="source">Origem</Label>
              <Input
                id="source"
                name="source"
                placeholder="Ex.: Instagram, indicação"
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="campaign">Campanha</Label>
              <Input
                id="campaign"
                name="campaign"
                placeholder="Nome da campanha"
                maxLength={160}
              />
            </div>
          </div>
          <div className="mt-4">
            <Label htmlFor="summary">Resumo</Label>
            <Textarea
              id="summary"
              name="summary"
              rows={3}
              placeholder="Contexto e necessidade principal do lead"
              maxLength={2000}
            />
          </div>
          <div className="mt-4">
            <Label htmlFor="nextAction">Próxima ação</Label>
            <Input
              id="nextAction"
              name="nextAction"
              placeholder="Ex.: Ligar amanhã às 10h"
              maxLength={500}
            />
          </div>
        </section>

        <div className="flex justify-end gap-2">
          <Link
            href="/leads"
            className="inline-flex h-10 items-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-dark">
            <Save className="size-4" /> Criar lead
          </button>
        </div>
      </form>
    </div>
  );
}
