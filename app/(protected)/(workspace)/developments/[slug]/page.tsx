import { ArrowLeft, MapPin, Upload } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Select } from "@/components/ui/field";
import { formatCurrency } from "@/lib/utils";
import { getDevelopmentDetail } from "@/services/developments";
import { requireRealEstateWorkspace } from "@/services/workspace";

import { importSalesTable } from "../actions";

export const metadata = { title: "Espelho de vendas" };

const statusLabels = {
  available: "Disponível",
  reserved: "Reservado",
  sold: "Vendido",
  inactive: "Sem valor na tabela",
};

const statusStyles = {
  available: "bg-emerald-50 text-emerald-700",
  reserved: "bg-amber-50 text-amber-700",
  sold: "bg-blue-50 text-blue-700",
  inactive: "bg-gray-100 text-gray-600",
};

function money(value: number | null) {
  return value === null ? "—" : formatCurrency(value);
}

export default async function DevelopmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    page?: string;
    status?: string;
    message?: string;
    error?: string;
  }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { organization } = await requireRealEstateWorkspace();
  const development = await getDevelopmentDetail(organization.id, slug, {
    page: Number(query.page) || 1,
    status: query.status,
  });
  if (!development) notFound();

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <Link
        href="/developments"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-brand-dark"
      >
        <ArrowLeft className="size-3.5" /> Empreendimentos
      </Link>
      <PageHeader
        eyebrow={development.payment_plan_label ?? "Espelho de vendas"}
        title={development.name}
        description={`${development.total} unidades no espelho${
          development.sales_table_reference
            ? ` · fonte: ${development.sales_table_reference}`
            : ""
        }`}
      />
      <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
        <MapPin className="size-3.5" />
        {development.neighborhood ? `${development.neighborhood}, ` : ""}
        {development.city}
        {development.state ? ` - ${development.state}` : ""}
      </p>
      {development.notes && (
        <p className="mt-3 max-w-3xl text-xs leading-5 text-gray-500">{development.notes}</p>
      )}

      {query.error && (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {query.error}
        </p>
      )}
      {query.message && (
        <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {query.message}
        </p>
      )}

      <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
        <form className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-xs sm:grid-cols-[220px_auto]">
          <Select
            name="status"
            defaultValue={query.status ?? "all"}
            aria-label="Filtrar unidades por status"
          >
            <option value="all">Todos os status</option>
            <option value="available">Disponíveis</option>
            <option value="reserved">Reservadas</option>
            <option value="sold">Vendidas</option>
            <option value="inactive">Sem valor na tabela</option>
          </Select>
          <button className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Filtrar
          </button>
        </form>
        <form
          action={importSalesTable}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-xs"
        >
          <input type="hidden" name="slug" value={development.slug} />
          <input
            type="file"
            name="salesTable"
            accept="application/json,.json"
            required
            className="text-xs text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-gray-700"
          />
          <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-[#172033] hover:bg-brand-dark hover:text-white">
            <Upload className="size-4" /> Atualizar espelho
          </button>
        </form>
      </div>

      <section className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-xs">
        <table className="w-full min-w-[1080px] text-left text-xs">
          <thead className="bg-gray-50 text-[10px] tracking-wide text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Unidade</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Área útil</th>
              <th className="px-4 py-3 text-right font-semibold">Lote</th>
              <th className="px-4 py-3 text-right font-semibold">Valor</th>
              <th className="px-4 py-3 text-right font-semibold">R$/m²</th>
              <th className="px-4 py-3 text-right font-semibold">Ato / sinal</th>
              <th className="px-4 py-3 text-right font-semibold">Mensais</th>
              <th className="px-4 py-3 text-right font-semibold">Anuais</th>
              <th className="px-4 py-3 text-right font-semibold">Chaves</th>
              <th className="px-4 py-3 text-right font-semibold">Financiamento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {development.units.map((unit) => (
              <tr key={unit.id} className="hover:bg-[#FFFDF8]">
                <td className="px-4 py-3">
                  <Link
                    href={`/properties/${unit.id}`}
                    className="font-semibold text-gray-900 hover:text-brand-dark"
                  >
                    {unit.code}
                  </Link>
                  {unit.unit_floor !== null && (
                    <span className="ml-2 text-[10px] text-gray-400">
                      {unit.unit_floor}º pav.
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-medium ${statusStyles[unit.status]}`}
                  >
                    {statusLabels[unit.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {unit.area_m2 === null ? "—" : `${unit.area_m2} m²`}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {unit.land_area_m2 === null ? "—" : `${unit.land_area_m2} m²`}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-[#172033]">
                  {unit.sale_terms ? money(unit.sale_terms.list_price) : "—"}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {money(unit.sale_terms?.price_per_m2 ?? null)}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {money(unit.sale_terms?.down_payment ?? null)}
                  {unit.sale_terms?.down_payment_percent !== null &&
                  unit.sale_terms?.down_payment_percent !== undefined ? (
                    <span className="ml-1 text-[10px] text-gray-400">
                      ({unit.sale_terms.down_payment_percent}%)
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {unit.sale_terms?.monthly_installment
                    ? `${unit.sale_terms.monthly_installment_count ?? "—"}× ${money(unit.sale_terms.monthly_installment)}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {unit.sale_terms?.annual_installment
                    ? `${unit.sale_terms.annual_installment_count ?? "—"}× ${money(unit.sale_terms.annual_installment)}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {money(unit.sale_terms?.keys_payment ?? null)}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {money(unit.sale_terms?.financing_amount ?? null)}
                  {unit.sale_terms?.financing_percent !== null &&
                  unit.sale_terms?.financing_percent !== undefined ? (
                    <span className="ml-1 text-[10px] text-gray-400">
                      ({unit.sale_terms.financing_percent}%)
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {development.totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Paginação">
          {Array.from({ length: development.totalPages }, (_, index) => index + 1).map(
            (page) => (
              <Link
                key={page}
                href={{
                  pathname: `/developments/${development.slug}`,
                  query: { status: query.status, page },
                }}
                className={`flex size-9 items-center justify-center rounded-lg text-xs font-medium ${
                  page === development.page
                    ? "bg-brand text-[#172033]"
                    : "border border-gray-200 bg-white text-gray-600"
                }`}
              >
                {page}
              </Link>
            ),
          )}
        </nav>
      )}
    </div>
  );
}
