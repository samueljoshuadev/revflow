import {
  Archive,
  ArrowLeft,
  Bath,
  BedDouble,
  CalendarDays,
  Camera,
  CarFront,
  MapPin,
  Pencil,
  Ruler,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PropertyForm } from "@/components/properties/property-form";
import { Input } from "@/components/ui/field";
import { formatCurrency } from "@/lib/utils";
import { getOrganizationMembers } from "@/services/organizations";
import { getPropertyDetail } from "@/services/properties";
import { requireRealEstateWorkspace } from "@/services/workspace";

import { archiveProperty, updateProperty, uploadPropertyPhoto } from "../actions";

type PropertyPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
};

export async function generateMetadata({ params }: PropertyPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Imóvel ${id.slice(0, 8)}` };
}

const statusLabels = {
  available: "Disponível",
  reserved: "Reservado",
  sold: "Vendido",
  inactive: "Inativo",
};

const purposeLabels = { sale: "Venda", rent: "Locação" };

export default async function PropertyPage({ params, searchParams }: PropertyPageProps) {
  const { id } = await params;
  const notice = await searchParams;
  const { organization } = await requireRealEstateWorkspace();
  const [property, members] = await Promise.all([
    getPropertyDetail(organization.id, id),
    getOrganizationMembers(organization.id),
  ]);
  if (!property) notFound();

  return (
    <div className="mx-auto max-w-[1420px] p-4 sm:p-6 lg:p-8">
      <Link href="/properties" className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="size-3.5" /> Voltar para imóveis</Link>
      {(notice.error || notice.message) && (
        <p className={`mt-4 rounded-xl border px-4 py-3 text-sm ${notice.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {notice.error ?? notice.message}
        </p>
      )}

      <header className="mt-5 overflow-hidden rounded-2xl border border-[#E8A51B]/20 bg-[#172033] text-white shadow-xl shadow-[#172033]/10">
        <div className="grid lg:grid-cols-[1fr_360px]">
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#E8A51B] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#172033] uppercase">{property.code}</span>
              <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] text-white/70">{statusLabels[property.status]}</span>
              <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] text-white/70">{purposeLabels[property.purpose]}</span>
            </div>
            <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">{property.title}</h1>
            <p className="mt-3 flex items-center gap-2 text-sm text-white/60"><MapPin className="size-4 text-[#E8A51B]" />{property.neighborhood ? `${property.neighborhood}, ` : ""}{property.city}</p>
            <p className="mt-7 text-3xl font-semibold tracking-[-0.04em] text-[#FFD978]">{formatCurrency(property.price)}</p>
          </div>
          <div className="border-t border-white/10 bg-white/5 p-6 lg:border-t-0 lg:border-l">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-[#FFD978] uppercase">Resumo do imóvel</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric icon={Ruler} label="Área" value={property.area_m2 === null ? "—" : `${property.area_m2} m²`} />
              <Metric icon={BedDouble} label="Quartos" value={property.bedrooms?.toString() ?? "—"} />
              <Metric icon={Bath} label="Banheiros" value={property.bathrooms?.toString() ?? "—"} />
              <Metric icon={CarFront} label="Vagas" value={property.parking_spaces?.toString() ?? "—"} />
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-white/60"><UserRound className="size-4" />{property.responsible_name ?? "Sem responsável"}</p>
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Galeria</h2>
                <p className="mt-1 text-xs text-gray-400">Fotos privadas e isoladas por organização</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-gray-400"><Camera className="size-4" />{property.photos.length}</span>
            </div>
            {property.photos.length ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {property.photos.map((photo) => (
                  <a key={photo.id} href={photo.signed_url ?? "#"} target="_blank" rel="noreferrer" className="block aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
                    <span className="block size-full bg-cover bg-center transition duration-300 hover:scale-[1.03]" style={photo.signed_url ? { backgroundImage: `url(${photo.signed_url})` } : undefined} />
                  </a>
                ))}
              </div>
            ) : (
              <div className="mt-5 flex min-h-36 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-400">Nenhuma foto cadastrada.</div>
            )}
            <form action={uploadPropertyPhoto} className="mt-4 flex flex-col gap-3 rounded-xl bg-[#FFF6D8]/55 p-4 sm:flex-row sm:items-end">
              <input type="hidden" name="propertyId" value={property.id} />
              <div className="flex-1">
                <label htmlFor="photo" className="mb-1.5 block text-xs font-medium text-gray-700">Adicionar foto</label>
                <Input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required className="pt-2" />
                <p className="mt-1 text-[10px] text-gray-500">JPG, PNG ou WebP, até 5MB.</p>
              </div>
              <button className="h-10 rounded-lg bg-brand px-4 text-xs font-semibold text-[#172033] hover:bg-brand-dark hover:text-white">Enviar foto</button>
            </form>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
            <h2 className="text-sm font-semibold text-gray-900">Descrição e características</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-600">{property.description || "Nenhuma descrição informada."}</p>
            {property.features.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">{property.features.map((feature) => <span key={feature} className="rounded-full bg-[#FFF6D8] px-3 py-1.5 text-xs font-medium text-[#8B5B05]">{feature}</span>)}</div>
            )}
          </section>

          <details className="group rounded-xl border border-gray-200 bg-white shadow-xs">
            <summary className="flex cursor-pointer list-none items-center gap-2 p-5 text-sm font-semibold text-gray-900"><Pencil className="size-4 text-brand-dark" /> Editar informações</summary>
            <div className="border-t border-gray-100 p-5 sm:p-6"><PropertyForm action={updateProperty} members={members} property={property} /></div>
          </details>
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-semibold text-gray-900">Leads relacionados</h2>
            <div className="mt-4 space-y-3">
              {property.matches.length ? property.matches.map((match) => (
                <Link key={match.id} href={`/leads/${match.lead_id}`} className="block rounded-lg border border-gray-100 p-3 hover:border-[#E8A51B]/40 hover:bg-[#FFF6D8]/30">
                  <div className="flex items-center justify-between"><p className="text-xs font-semibold text-gray-800">{match.lead_name ?? "Lead"}</p><span className="text-xs font-bold text-brand-dark">{match.score}%</span></div>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-gray-500">{match.match_reason}</p>
                </Link>
              )) : <p className="rounded-lg bg-gray-50 p-4 text-xs leading-5 text-gray-400">Nenhum lead relacionado a este imóvel.</p>}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2"><CalendarDays className="size-4 text-brand-dark" /><h2 className="text-sm font-semibold text-gray-900">Visitas</h2></div>
            <div className="mt-4 space-y-3">
              {property.visits.length ? property.visits.map((visit) => (
                <article key={visit.id} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-800">{visit.lead_name ?? "Lead"}</p>
                  <p className="mt-1 text-[10px] text-gray-500">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: organization.timezone }).format(new Date(visit.starts_at))}</p>
                  <p className="mt-1 text-[10px] font-medium text-brand-dark">{visit.status}</p>
                </article>
              )) : <p className="rounded-lg bg-gray-50 p-4 text-xs text-gray-400">Nenhuma visita registrada.</p>}
            </div>
          </section>

          <form action={archiveProperty}>
            <input type="hidden" name="propertyId" value={property.id} />
            <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50"><Archive className="size-4" /> Arquivar imóvel</button>
          </form>
        </aside>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Ruler; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <Icon className="size-4 text-[#FFD978]" />
      <p className="mt-3 text-[10px] text-white/45">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

