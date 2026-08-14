import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Plus,
  Video,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { getCalendarData } from "@/services/calendar";
import { requireWorkspace } from "@/services/workspace";

import { createMeeting, updateMeetingStatus } from "./actions";

export const metadata = { title: "Agenda" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; leadId?: string; message?: string }>;
}) {
  const params = await searchParams;
  const { user, organization } = await requireWorkspace();
  const { meetings, leads, members, referenceTime } = await getCalendarData(
    organization.id,
  );
  const now = new Date(referenceTime).getTime();
  const upcoming = meetings.filter(
    (meeting) =>
      new Date(meeting.ends_at).getTime() >= now &&
      meeting.status === "scheduled",
  );
  const history = meetings
    .filter((meeting) => !upcoming.some((item) => item.id === meeting.id))
    .slice(-30)
    .reverse();
  const selectedLead =
    params.leadId && leads.some((lead) => lead.id === params.leadId)
      ? leads.find((lead) => lead.id === params.leadId)
      : null;
  const defaultTitle = selectedLead
    ? suggestedMeetingTitle(selectedLead)
    : "";
  const defaultDescription = selectedLead?.next_action
    ? `Próxima ação sugerida: ${selectedLead.next_action}`
    : "";
  const defaultOwnerId = selectedLead?.owner_id ?? user.id;

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Compromissos comerciais"
        title="Agenda"
        description={`${upcoming.length} reuniões futuras · horários em ${organization.timezone}`}
      />
      {(params.error || params.message) && (
        <p
          className={`mt-6 rounded-lg border px-4 py-3 text-sm ${params.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
        >
          {params.error ?? params.message}
        </p>
      )}

      <div className="mt-7 grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <section className="h-fit rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex items-center gap-2">
            <Plus className="size-4 text-brand" />
            <h2 className="text-sm font-semibold text-gray-900">
              Nova reunião
            </h2>
          </div>
          {leads.length === 0 ? (
            <p className="mt-5 rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              Cadastre um lead antes de agendar. Nenhum contato fictício será
              criado.
            </p>
          ) : (
            <form action={createMeeting} className="mt-5 space-y-4">
              <Field
                label="Título"
                name="title"
                defaultValue={defaultTitle}
                placeholder="Reunião de diagnóstico"
                required
              />
              <div>
                <Label htmlFor="leadId">Lead</Label>
                <Select
                  id="leadId"
                  name="leadId"
                  defaultValue={selectedLead?.id ?? ""}
                  required
                >
                  <option value="">Selecione</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name}
                      {lead.company ? ` · ${lead.company}` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="ownerId">Responsável</Label>
                <Select
                  id="ownerId"
                  name="ownerId"
                  defaultValue={defaultOwnerId}
                  required
                >
                  {members.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.profile?.full_name ??
                        (member.user_id === user.id ? "Você" : "Membro")}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-[1fr_120px] gap-3">
                <Field
                  label="Data e hora"
                  name="startsAt"
                  type="datetime-local"
                  required
                />
                <div>
                  <Label htmlFor="utcOffset">UTC</Label>
                  <Select id="utcOffset" name="utcOffset" defaultValue="-03:00">
                    {[
                      "-05:00",
                      "-04:00",
                      "-03:00",
                      "-02:00",
                      "+00:00",
                      "+01:00",
                    ].map((offset) => (
                      <option key={offset}>{offset}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <Field
                label="Duração (min)"
                name="duration"
                type="number"
                min={15}
                max={240}
                defaultValue={organization.booking_duration_minutes}
                required
              />
              <Field
                label="Local ou link"
                name="location"
                defaultValue={organization.meeting_location ?? ""}
              />
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  maxLength={2000}
                  defaultValue={defaultDescription}
                />
              </div>
              <label className="flex gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs leading-5 text-gray-600">
                <input
                  type="checkbox"
                  name="notifyLeadByEmail"
                  defaultChecked={Boolean(selectedLead?.email)}
                  className="mt-1 size-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <span>
                  Enviar convite por e-mail pelo Google Calendar
                  {selectedLead?.email ? (
                    <span className="block text-gray-400">
                      O cliente receberá o convite em {selectedLead.email}.
                    </span>
                  ) : (
                    <span className="block text-amber-700">
                      O lead precisa ter e-mail cadastrado para receber o convite.
                    </span>
                  )}
                </span>
              </label>
              <button className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gray-950 text-sm font-medium text-white hover:bg-gray-800">
                <CalendarDays className="size-4" /> Agendar
              </button>
            </form>
          )}
        </section>

        <div className="space-y-6">
          <MeetingList
            title="Próximas reuniões"
            meetings={upcoming}
            timezone={organization.timezone}
            actionable
          />
          <MeetingList
            title="Histórico recente"
            meetings={history}
            timezone={organization.timezone}
          />
        </div>
      </div>
    </div>
  );
}

function suggestedMeetingTitle(lead: {
  company: string | null;
  name: string;
}) {
  return `Diagnóstico comercial - ${lead.company || lead.name}`;
}

function MeetingList({
  title,
  meetings,
  timezone,
  actionable = false,
}: {
  title: string;
  meetings: Awaited<ReturnType<typeof getCalendarData>>["meetings"];
  timezone: string;
  actionable?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
      <div className="border-b border-gray-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      {meetings.length === 0 ? (
        <div className="flex min-h-36 flex-col items-center justify-center text-center">
          <CalendarDays className="size-6 text-gray-300" />
          <p className="mt-2 text-sm text-gray-400">
            Nenhuma reunião encontrada.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {meetings.map((meeting) => (
            <article key={meeting.id} className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-2 rounded-full ${meeting.status === "scheduled" ? "bg-violet-500" : meeting.status === "completed" ? "bg-emerald-500" : "bg-gray-300"}`}
                    />
                    <h3 className="text-sm font-semibold text-gray-900">
                      {meeting.title}
                    </h3>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {meeting.lead?.name ?? "Lead removido"}
                    {meeting.owner?.full_name
                      ? ` · ${meeting.owner.full_name}`
                      : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Clock3 className="size-3.5" />
                      {formatMeeting(
                        meeting.starts_at,
                        meeting.ends_at,
                        timezone,
                      )}
                    </span>
                    {meeting.location && (
                      <span className="flex items-center gap-1.5">
                        <Video className="size-3.5" />
                        {meeting.location}
                      </span>
                    )}
                  </div>
                </div>
                {actionable && (
                  <div className="flex gap-2">
                    <StatusButton
                      meetingId={meeting.id}
                      status="completed"
                      label="Concluir"
                      icon={<CheckCircle2 className="size-3.5" />}
                    />
                    <StatusButton
                      meetingId={meeting.id}
                      status="cancelled"
                      label="Cancelar"
                      icon={<XCircle className="size-3.5" />}
                    />
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function StatusButton({
  meetingId,
  status,
  label,
  icon,
}: {
  meetingId: string;
  status: "completed" | "cancelled";
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <form action={updateMeetingStatus}>
      <input type="hidden" name="meetingId" value={meetingId} />
      <input type="hidden" name="status" value={status} />
      <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-xs text-gray-600 hover:bg-gray-50">
        {icon}
        {label}
      </button>
    </form>
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

function formatMeeting(startsAt: string, endsAt: string, timezone: string) {
  const date = new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(startsAt));
  const end = new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(endsAt));
  return `${date} – ${end}`;
}
