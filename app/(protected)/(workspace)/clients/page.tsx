import {
  BriefcaseBusiness,
  FileText,
  FolderKanban,
  Plus,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Input, Label, Select } from "@/components/ui/field";
import { formatCurrency } from "@/lib/utils";
import { getPostSaleData } from "@/services/clients";
import { requireWorkspace } from "@/services/workspace";

import { createCustomer, createProject, createProposal } from "./actions";

export const metadata = { title: "Clientes e pós-venda" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const { organization } = await requireWorkspace();
  const { clients, proposals, projects } = await getPostSaleData(
    organization.id,
  );
  const activeProjects = projects.filter((project) =>
    ["planned", "active", "paused"].includes(project.status),
  );

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Receita e entrega"
        title="Clientes e pós-venda"
        description="Da proposta aceita ao acompanhamento dos projetos."
      />
      {(params.error || params.message) && (
        <p
          className={`mt-6 rounded-lg border px-4 py-3 text-sm ${params.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
        >
          {params.error ?? params.message}
        </p>
      )}

      <section className="mt-7 grid gap-3 sm:grid-cols-3">
        <Metric
          icon={<Users className="size-4" />}
          label="Clientes"
          value={clients.length}
        />
        <Metric
          icon={<FileText className="size-4" />}
          label="Propostas abertas"
          value={
            proposals.filter(
              (proposal) =>
                !["accepted", "rejected", "expired"].includes(proposal.status),
            ).length
          }
        />
        <Metric
          icon={<FolderKanban className="size-4" />}
          label="Projetos ativos"
          value={activeProjects.length}
        />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Base de clientes
            </h2>
          </div>
          {clients.length === 0 ? (
            <Empty
              icon={<Users className="size-7" />}
              text="Nenhum cliente cadastrado. Converta um lead ganho ou cadastre o primeiro."
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {clients.map((client) => {
                const clientProposals = proposals.filter(
                  (proposal) => proposal.client_id === client.id,
                );
                const clientProjects = projects.filter(
                  (project) => project.client_id === client.id,
                );
                return (
                  <article
                    key={client.id}
                    className="flex items-center justify-between gap-4 p-5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {client.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {client.company ||
                          client.email ||
                          "Sem empresa informada"}
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-gray-500">
                      <p>{clientProposals.length} propostas</p>
                      <p className="mt-1">{clientProjects.length} projetos</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <FormCard
            title="Novo cliente"
            action={createCustomer}
            icon={<Plus className="size-4" />}
          >
            <Field label="Nome" name="name" required />
            <Field label="Empresa" name="company" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="E-mail" name="email" type="email" />
              <Field label="Telefone" name="phone" />
            </div>
            <Field label="CNPJ/CPF" name="document" />
          </FormCard>
          {clients.length > 0 && (
            <FormCard
              title="Nova proposta"
              action={createProposal}
              icon={<FileText className="size-4" />}
            >
              <ClientSelect clients={clients} />
              <Field label="Título" name="title" required />
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Valor"
                  name="total"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                />
                <Field label="Válida até" name="validUntil" type="date" />
              </div>
            </FormCard>
          )}
          {clients.length > 0 && (
            <FormCard
              title="Novo projeto"
              action={createProject}
              icon={<BriefcaseBusiness className="size-4" />}
            >
              <ClientSelect clients={clients} />
              <Field label="Nome" name="name" required />
              <Field label="Prazo" name="dueOn" type="date" />
            </FormCard>
          )}
        </div>
      </div>

      {proposals.length > 0 && (
        <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
          <h2 className="text-sm font-semibold text-gray-900">
            Propostas recentes
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {proposals.slice(0, 9).map((proposal) => (
              <article
                key={proposal.id}
                className="rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <p className="text-sm font-medium text-gray-800">
                  {proposal.title}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs capitalize text-gray-500">
                    {proposal.status}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(proposal.total)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <article className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
      <span className="flex size-9 items-center justify-center rounded-lg bg-violet-50 text-brand">
        {icon}
      </span>
      <div>
        <p className="text-xl font-semibold text-gray-950">{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </article>
  );
}
function FormCard({
  title,
  action,
  icon,
  children,
}: {
  title: string;
  action: (formData: FormData) => void | Promise<void>;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
      <div className="flex items-center gap-2 text-brand">
        {icon}
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <form action={action} className="mt-4 space-y-3">
        {children}
        <button className="h-9 w-full rounded-lg bg-gray-950 text-xs font-medium text-white hover:bg-gray-800">
          Salvar
        </button>
      </form>
    </section>
  );
}
function ClientSelect({
  clients,
}: {
  clients: Awaited<ReturnType<typeof getPostSaleData>>["clients"];
}) {
  return (
    <div>
      <Label htmlFor="clientId">Cliente</Label>
      <Select id="clientId" name="clientId" required>
        <option value="">Selecione</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </Select>
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
function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center text-gray-300">
      {icon}
      <p className="mt-3 max-w-sm text-sm leading-6 text-gray-400">{text}</p>
    </div>
  );
}
