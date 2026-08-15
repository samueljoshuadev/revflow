import { Building2, Camera, MapPin, Plus, Search } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Input, Select } from "@/components/ui/field";
import { formatCurrency } from "@/lib/utils";
import { listProperties } from "@/services/properties";
import { requireRealEstateWorkspace } from "@/services/workspace";

export const metadata = { title: "Imóveis" };

const statusLabels = {
  available: "Disponível",
  reserved: "Reservado",
  sold: "Vendido",
  inactive: "Inativo",
};

const statusStyles = {
  available: "bg-emerald-50 text-emerald-700",
  reserved: "bg-amber-50 text-amber-700",
  sold: "bg-blue-50 text-blue-700",
  inactive: "bg-gray-100 text-gray-600",
};

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { organization } = await requireRealEstateWorkspace();
  const result = await listProperties(organization.id, {
    page: Number(params.page) || 1,
    query: params.q,
    status: params.status,
  });

  return (
    <div className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Portfólio comercial"
        title="Imóveis"
        description={`${result.total} imóveis cadastrados nesta organização`}
        actions={
          <Link href="/properties/new" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-[#172033] shadow-sm hover:bg-brand-dark hover:text-white">
            <Plus className="size-4" /> Novo imóvel
          </Link>
        }
      />
      {params.error && (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{params.error}</p>
      )}
      <form className="mt-6 grid gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-xs sm:grid-cols-[1fr_190px_auto]">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
          <Input name="q" defaultValue={params.q ?? ""} placeholder="Código, imóvel, cidade ou bairro" className="pl-9" />
        </div>
        <Select name="status" defaultValue={params.status ?? "all"} aria-label="Filtrar por status">
          <option value="all">Todos os status</option>
          <option value="available">Disponíveis</option>
          <option value="reserved">Reservados</option>
          <option value="sold">Vendidos</option>
          <option value="inactive">Inativos</option>
        </Select>
        <button className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">Filtrar</button>
      </form>

      {result.items.length === 0 ? (
        <section className="mt-6 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-[#E8A51B]/35 bg-[#FFF6D8]/40 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-white text-brand shadow-xs"><Building2 className="size-5" /></span>
          <h2 className="mt-4 text-sm font-semibold text-gray-900">Nenhum imóvel encontrado</h2>
          <p className="mt-1 max-w-sm text-xs leading-5 text-gray-500">Cadastre o primeiro imóvel real da organização. Nenhum registro fictício será criado.</p>
          <Link href="/properties/new" className="mt-4 text-xs font-semibold text-brand-dark hover:underline">Cadastrar imóvel</Link>
        </section>
      ) : (
        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {result.items.map((property, index) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="group animate-fade-up overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs hover:-translate-y-0.5 hover:border-[#E8A51B]/45 hover:shadow-lg"
              style={{ animationDelay: `${index * 35}ms` }}
            >
              <div className="flex h-28 items-center justify-center bg-gradient-to-br from-[#FFF6D8] to-[#fffaf0] text-[#C77B08]">
                <Building2 className="size-9 opacity-70" />
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold tracking-wide text-[#A56604] uppercase">{property.code}</p>
                    <h2 className="mt-1 truncate text-sm font-semibold text-gray-950">{property.title}</h2>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${statusStyles[property.status]}`}>{statusLabels[property.status]}</span>
                </div>
                <p className="mt-4 text-xl font-semibold tracking-[-0.03em] text-[#172033]">{formatCurrency(property.price)}</p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-gray-500">
                  <span className="flex min-w-0 items-center gap-1.5"><MapPin className="size-3.5 shrink-0" /><span className="truncate">{property.neighborhood ? `${property.neighborhood}, ` : ""}{property.city}</span></span>
                  <span className="flex shrink-0 items-center gap-1"><Camera className="size-3.5" />{property.photo_count}</span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}

      {result.totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Paginação">
          {Array.from({ length: result.totalPages }, (_, index) => index + 1).slice(Math.max(0, result.page - 3), result.page + 2).map((page) => (
            <Link key={page} href={{ pathname: "/properties", query: { q: params.q, status: params.status, page } }} className={`flex size-9 items-center justify-center rounded-lg text-xs font-medium ${page === result.page ? "bg-brand text-[#172033]" : "border border-gray-200 bg-white text-gray-600"}`}>{page}</Link>
          ))}
        </nav>
      )}
    </div>
  );
}

