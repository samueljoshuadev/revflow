import { CalendarCheck2, CalendarClock, CheckCircle2, MapPin, Plus, UserRound, XCircle } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Input, Select } from "@/components/ui/field";
import { getCalendarData } from "@/services/calendar";
import { requireRealEstateWorkspace } from "@/services/workspace";

import { updateMeetingStatus } from "../calendar/actions";
import { rescheduleVisit } from "./actions";

export const metadata = { title: "Visitas" };

export default async function VisitsPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const notice = await searchParams;
  const { organization } = await requireRealEstateWorkspace();
  const { meetings, referenceTime } = await getCalendarData(organization.id);
  const visits = meetings.filter((meeting) => meeting.property_id !== null);
  const now = new Date(referenceTime).getTime();
  const upcoming = visits.filter((visit) => visit.status === "scheduled" && new Date(visit.ends_at).getTime() >= now);
  const history = visits.filter((visit) => !upcoming.some((item) => item.id === visit.id)).reverse();

  return (
    <div className="mx-auto max-w-[1420px] p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Operação imobiliária"
        title="Visitas"
        description={`${upcoming.length} próximas · ${history.length} no histórico recente`}
        actions={<Link href="/calendar" className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-[#172033] hover:bg-brand-dark hover:text-white"><Plus className="size-4" /> Agendar visita</Link>}
      />
      {(notice.error || notice.message) && <p className={`mt-5 rounded-lg border px-4 py-3 text-sm ${notice.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{notice.error ?? notice.message}</p>}

      <section className="mt-7 grid gap-4 xl:grid-cols-2">
        {upcoming.length ? upcoming.map((visit, index) => (
          <article key={visit.id} className="animate-fade-up rounded-xl border border-[#E8A51B]/25 bg-white p-5 shadow-xs" style={{ animationDelay: `${index * 35}ms` }}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-wide text-brand-dark uppercase">Visita agendada</p>
                <h2 className="mt-1 truncate text-base font-semibold text-gray-950">{visit.property?.title ?? visit.title}</h2>
                {visit.property && <Link href={`/properties/${visit.property.id}`} className="mt-1 inline-flex text-xs font-medium text-brand-dark hover:underline">{visit.property.code}</Link>}
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF6D8] text-brand-dark"><CalendarCheck2 className="size-5" /></span>
            </div>
            <div className="mt-5 grid gap-3 rounded-xl bg-gray-50 p-4 text-xs text-gray-600 sm:grid-cols-2">
              <p className="flex items-center gap-2"><CalendarClock className="size-4 text-brand-dark" />{formatDate(visit.starts_at, organization.timezone)}</p>
              <p className="flex items-center gap-2"><UserRound className="size-4 text-brand-dark" />{visit.lead?.name ?? "Lead"}</p>
              {visit.location && <p className="flex items-center gap-2 sm:col-span-2"><MapPin className="size-4 text-brand-dark" />{visit.location}</p>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <form action={updateMeetingStatus}>
                <input type="hidden" name="meetingId" value={visit.id} /><input type="hidden" name="status" value="completed" />
                <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700"><CheckCircle2 className="size-4" /> Compareceu</button>
              </form>
              <form action={updateMeetingStatus}>
                <input type="hidden" name="meetingId" value={visit.id} /><input type="hidden" name="status" value="no_show" />
                <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-xs text-gray-600 hover:bg-gray-50">Não compareceu</button>
              </form>
              <form action={updateMeetingStatus}>
                <input type="hidden" name="meetingId" value={visit.id} /><input type="hidden" name="status" value="cancelled" />
                <button className="inline-flex size-9 items-center justify-center rounded-lg border border-red-100 text-red-500 hover:bg-red-50" aria-label="Cancelar visita"><XCircle className="size-4" /></button>
              </form>
            </div>
            <details className="mt-4 border-t border-gray-100 pt-4">
              <summary className="cursor-pointer text-xs font-semibold text-brand-dark">Reagendar</summary>
              <form action={rescheduleVisit} className="mt-3 grid gap-3 sm:grid-cols-[1fr_110px_90px_auto]">
                <input type="hidden" name="meetingId" value={visit.id} />
                <Input type="datetime-local" name="startsAt" required aria-label="Nova data e hora" />
                <Select name="utcOffset" defaultValue="-03:00" aria-label="Fuso UTC"><option>-03:00</option><option>-04:00</option><option>-02:00</option></Select>
                <Input type="number" name="duration" min={15} max={240} defaultValue={60} required aria-label="Duração" />
                <button className="h-10 rounded-lg bg-gray-950 px-3 text-xs font-medium text-white">Salvar</button>
              </form>
            </details>
          </article>
        )) : (
          <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-[#E8A51B]/30 bg-[#FFF6D8]/35 text-center xl:col-span-2"><CalendarCheck2 className="size-7 text-brand" /><p className="mt-3 text-sm font-semibold text-gray-800">Nenhuma visita futura</p><p className="mt-1 text-xs text-gray-500">Agende pela agenda e associe um imóvel real.</p></div>
        )}
      </section>

      <section className="mt-7 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        <div className="border-b border-gray-100 px-5 py-4"><h2 className="text-sm font-semibold text-gray-900">Histórico</h2></div>
        {history.length ? <div className="divide-y divide-gray-100">{history.slice(0, 100).map((visit) => (
          <div key={visit.id} className="grid gap-2 px-5 py-4 text-xs sm:grid-cols-[1fr_1fr_180px_100px] sm:items-center">
            <p className="font-semibold text-gray-800">{visit.property?.title ?? visit.title}</p><p className="text-gray-500">{visit.lead?.name ?? "Lead"}</p><p className="text-gray-500">{formatDate(visit.starts_at, organization.timezone)}</p><p className="font-medium text-brand-dark">{visit.status}</p>
          </div>
        ))}</div> : <p className="p-8 text-center text-xs text-gray-400">Nenhuma visita anterior.</p>}
      </section>
    </div>
  );
}

function formatDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(value));
}
