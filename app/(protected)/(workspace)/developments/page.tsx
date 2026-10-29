import { Building, MapPin } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/utils";
import { listDevelopmentSummaries } from "@/services/developments";
import { requireRealEstateWorkspace } from "@/services/workspace";

export const metadata = { title: "Empreendimentos" };

export default async function DevelopmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { organization } = await requireRealEstateWorkspace();
  const developments = await listDevelopmentSummaries(organization.id);

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Espelho de vendas"
        title="Empreendimentos"
        description={`${developments.length} empreendimento(s) nesta conta`}
      />
      {params.error && (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {params.error}
        </p>
      )}
      {params.message && (
        <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {params.message}
        </p>
      )}

      {developments.length === 0 ? (
        <section className="mt-6 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-[#E8A51B]/35 bg-[#FFF6D8]/40 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-white text-brand shadow-xs">
            <Building className="size-5" />
          </span>
          <h2 className="mt-4 text-sm font-semibold text-gray-900">
            Nenhum empreendimento cadastrado
          </h2>
          <p className="mt-1 max-w-sm text-xs leading-5 text-gray-500">
            O empreendimento e o espelho de vendas são provisionados a partir da tabela
            oficial recebida da incorporadora.
          </p>
        </section>
      ) : (
        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {developments.map((development, index) => (
            <Link
              key={development.id}
              href={`/developments/${development.slug}`}
              className="group animate-fade-up rounded-xl border border-gray-200 bg-white p-5 shadow-xs hover:-translate-y-0.5 hover:border-[#E8A51B]/45 hover:shadow-lg"
              style={{ animationDelay: `${index * 35}ms` }}
            >
              <h2 className="truncate text-sm font-semibold text-gray-950">
                {development.name}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-500">
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">
                  {development.neighborhood ? `${development.neighborhood}, ` : ""}
                  {development.city}
                </span>
              </p>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-emerald-50 py-2">
                  <dt className="text-[10px] font-medium text-emerald-700">Disponíveis</dt>
                  <dd className="text-sm font-semibold text-emerald-800">
                    {development.units_available}
                  </dd>
                </div>
                <div className="rounded-lg bg-amber-50 py-2">
                  <dt className="text-[10px] font-medium text-amber-700">Reservadas</dt>
                  <dd className="text-sm font-semibold text-amber-800">
                    {development.units_reserved}
                  </dd>
                </div>
                <div className="rounded-lg bg-blue-50 py-2">
                  <dt className="text-[10px] font-medium text-blue-700">Vendidas</dt>
                  <dd className="text-sm font-semibold text-blue-800">
                    {development.units_sold}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 text-[11px] text-gray-500">
                {development.units_imported} de {development.total_units ?? development.units_imported} unidades no espelho
              </p>
              {development.min_available_price !== null && (
                <p className="mt-1 text-sm font-semibold tracking-[-0.02em] text-[#172033]">
                  {formatCurrency(development.min_available_price)}
                  {development.max_available_price !== null &&
                  development.max_available_price !== development.min_available_price
                    ? ` – ${formatCurrency(development.max_available_price)}`
                    : ""}
                </p>
              )}
              {development.sales_table_updated_at && (
                <p className="mt-3 text-[10px] text-gray-400">
                  Tabela importada em{" "}
                  {new Date(development.sales_table_updated_at).toLocaleDateString("pt-BR")}
                </p>
              )}
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
