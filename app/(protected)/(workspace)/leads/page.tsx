import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { cn, formatCurrency, formatRelativeDate } from "@/lib/utils";
import { listLeads } from "@/services/leads";
import { requireWorkspace } from "@/services/workspace";

export const metadata = { title: "Leads" };

const priorityLabels = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};
const priorityStyles = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-red-50 text-red-700",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; priority?: string }>;
}) {
  const params = await searchParams;
  const { organization } = await requireWorkspace();
  const currentPage = Math.max(Number.parseInt(params.page ?? "1", 10) || 1, 1);
  const priorities = ["low", "medium", "high", "urgent"] as const;
  const priority = priorities.find((value) => value === params.priority);
  const result = await listLeads(organization.id, {
    query: params.q,
    page: currentPage,
    priority,
  });
  const pageCount = Math.max(Math.ceil(result.count / result.pageSize), 1);

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Base comercial"
        title="Leads"
        description={`${result.count.toLocaleString("pt-BR")} contatos no workspace`}
        actions={
          <Link
            href="/leads/new"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-gray-950 px-3.5 text-xs font-medium text-white shadow-sm hover:bg-gray-800"
          >
            <Plus className="size-4" /> Novo lead
          </Link>
        }
      />

      <section className="mt-7 overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-3 sm:flex-row sm:items-center">
          <form
            className="flex w-full flex-col gap-2 sm:flex-row sm:items-center"
            action="/leads"
          >
            <div className="relative w-full max-w-sm">
              <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-gray-400" />
              <input
                name="q"
                defaultValue={params.q}
                className="h-9 w-full rounded-lg border border-gray-200 pr-3 pl-8 text-xs placeholder:text-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                placeholder="Buscar por nome"
                aria-label="Buscar leads por nome"
              />
            </div>
            <select
              name="priority"
              defaultValue={priority ?? ""}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              aria-label="Filtrar por prioridade"
            >
              <option value="">Todas as prioridades</option>
              <option value="urgent">Urgente</option>
              <option value="high">Alta</option>
              <option value="medium">Média</option>
              <option value="low">Baixa</option>
            </select>
            <button className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Aplicar
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60 text-[10px] font-semibold tracking-[0.08em] text-gray-400 uppercase">
                <th className="px-5 py-3">Lead</th>
                <th className="px-4 py-3">Etapa</th>
                <th className="px-4 py-3">Serviço</th>
                <th className="px-4 py-3">Prioridade</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-5 py-3 text-right">Atualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="group transition hover:bg-gray-50/70"
                >
                  <td className="px-5 py-3.5">
                    <Link href={`/leads/${lead.id}`} className="block">
                      <p className="text-[13px] font-semibold text-gray-900 group-hover:text-brand">
                        {lead.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {lead.company || lead.email || "Sem empresa"}
                      </p>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    {lead.stage ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                        <span
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: lead.stage.color }}
                        />
                        {lead.stage.name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-[11px] text-gray-500">
                    {lead.service?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={cn(
                        "rounded-md px-2 py-1 text-[10px] font-medium",
                        priorityStyles[lead.priority],
                      )}
                    >
                      {priorityLabels[lead.priority]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right text-xs font-medium text-gray-700">
                    {formatCurrency(lead.estimated_budget)}
                  </td>
                  <td className="px-4 py-3.5 text-[11px] text-gray-500">
                    {lead.source || "Direto"}
                  </td>
                  <td className="px-5 py-3.5 text-right text-[10px] text-gray-400">
                    {formatRelativeDate(lead.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.leads.length === 0 && (
            <div className="flex min-h-56 flex-col items-center justify-center text-center">
              <Search className="size-7 text-gray-300" />
              <h2 className="mt-3 text-sm font-semibold text-gray-800">
                Nenhum lead encontrado
              </h2>
              <p className="mt-1 text-xs text-gray-400">
                {params.q
                  ? "Tente uma busca diferente."
                  : "Crie o primeiro lead do pipeline."}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
          <p className="text-[10px] text-gray-400">
            Página {Math.min(currentPage, pageCount)} de {pageCount}
          </p>
          <div className="flex gap-1">
            <PaginationLink
              href={pageHref(Math.max(currentPage - 1, 1), params.q, priority)}
              disabled={currentPage <= 1}
              label="Página anterior"
            >
              <ChevronLeft className="size-3.5" />
            </PaginationLink>
            <PaginationLink
              href={pageHref(
                Math.min(currentPage + 1, pageCount),
                params.q,
                priority,
              )}
              disabled={currentPage >= pageCount}
              label="Próxima página"
            >
              <ChevronRight className="size-3.5" />
            </PaginationLink>
          </div>
        </div>
      </section>
    </div>
  );
}

function pageHref(page: number, query?: string, priority?: string) {
  const params = new URLSearchParams({ page: String(page) });
  if (query) params.set("q", query);
  if (priority) params.set("priority", priority);
  return `/leads?${params.toString()}`;
}

function PaginationLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : undefined}
      className={cn(
        "flex size-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500",
        disabled ? "pointer-events-none opacity-40" : "hover:bg-gray-50",
      )}
    >
      {children}
    </Link>
  );
}
