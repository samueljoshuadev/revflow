import { Clock3, FileSignature, Grid3x3 } from "lucide-react";
import Link from "next/link";

import { Notice } from "@/components/developments/notice";
import { PageHeader } from "@/components/page-header";
import { isOrganizationAdmin } from "@/lib/developments";
import { describeDeadline, proposalStatusLabels, proposalStatusStyles } from "@/lib/proposals";
import { cn, formatCurrency } from "@/lib/utils";
import { listProposals } from "@/services/proposals";
import { requireRealEstateWorkspace } from "@/services/workspace";

export const metadata = { title: "Propostas" };

const filters = [
  ["open", "Abertas"],
  ["in_review", "Em análise"],
  ["queued", "Na fila"],
  ["countered", "Contraproposta"],
  ["draft", "Rascunhos"],
  ["approved", "Aprovadas"],
  ["rejected", "Recusadas"],
  ["all", "Todas"],
] as const;

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const status = params.status ?? "open";
  const { organization } = await requireRealEstateWorkspace();
  const isAdmin = isOrganizationAdmin(organization.role);
  const result = await listProposals(organization.id, { status, page: Number(params.page) || 1 });

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Vendas"
        title="Propostas"
        description={isAdmin ? "Todas as propostas da organização, com corretor e prazo." : "Suas propostas e as da sua equipe."}
        actions={
          <Link href="/developments" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-[#172033] shadow-sm hover:bg-brand-dark hover:text-white">
            <Grid3x3 className="size-4" /> Nova proposta pelo espelho
          </Link>
        }
      />
      <Notice error={params.error} message={params.message} />

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Filtrar propostas">
        {filters.map(([value, label]) => (
          <Link
            key={value}
            href={{ pathname: "/proposals", query: { status: value } }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              status === value ? "border-[#172033] bg-[#172033] text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {result.items.length === 0 ? (
        <section className="mt-6 flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#E8A51B]/35 bg-[#FFF6D8]/40 px-4 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-white text-brand shadow-xs"><FileSignature className="size-5" /></span>
          <h2 className="mt-4 text-sm font-semibold text-gray-900">Nenhuma proposta aqui</h2>
          <p className="mt-1 max-w-sm text-xs leading-5 text-gray-500">Abra o espelho, clique numa unidade disponível e use “Criar proposta”.</p>
        </section>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-xs">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/80 text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3">Proposta</th>
                <th className="px-4 py-3">Unidade</th>
                <th className="px-4 py-3">Comprador</th>
                {isAdmin && <th className="px-4 py-3">Corretor</th>}
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.items.map((proposal) => {
                const deadline = proposal.status === "in_review" || proposal.status === "countered" ? describeDeadline(proposal.sla_due_at) : null;
                return (
                  <tr key={proposal.id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3">
                      <Link href={`/proposals/${proposal.id}`} className="font-semibold text-gray-950 hover:underline">#{proposal.number}</Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{proposal.development_name} · {proposal.unit_code}</td>
                    <td className="px-4 py-3 text-gray-700">{proposal.buyer_name ?? "—"}</td>
                    {isAdmin && <td className="px-4 py-3 text-gray-700">{proposal.broker_name ?? "—"}</td>}
                    <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(proposal.offered_price)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", proposalStatusStyles[proposal.status])}>
                        {proposalStatusLabels[proposal.status]}
                        {proposal.status === "queued" && proposal.queue_position ? ` · ${proposal.queue_position}º` : ""}
                      </span>
                      {deadline && (
                        <span className={cn("ml-2 inline-flex items-center gap-1 text-[11px]", deadline.overdue ? "text-red-600" : "text-gray-500")}>
                          <Clock3 className="size-3" />{deadline.text}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {result.totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Paginação">
          {Array.from({ length: result.totalPages }, (_, index) => index + 1)
            .slice(Math.max(0, result.page - 3), result.page + 2)
            .map((page) => (
              <Link key={page} href={{ pathname: "/proposals", query: { status, page } }} className={cn("flex size-9 items-center justify-center rounded-lg text-xs font-medium", page === result.page ? "bg-brand text-[#172033]" : "border border-gray-200 bg-white text-gray-600")}>
                {page}
              </Link>
            ))}
        </nav>
      )}
    </div>
  );
}
