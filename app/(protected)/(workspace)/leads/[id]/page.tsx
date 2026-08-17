import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Flag,
  Mail,
  NotebookPen,
  Phone,
  Pencil,
  Archive,
  Trash2,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EventTimeline } from "@/components/leads/event-timeline";
import { NextActionForm } from "@/components/leads/next-action-form";
import { LeadRealEstatePanel } from "@/components/real-estate/lead-real-estate-panel";
import { Textarea } from "@/components/ui/field";
import { cn, formatCurrency, initials } from "@/lib/utils";
import { getLeadDetail } from "@/services/leads";
import { getLeadRealEstateData } from "@/services/real-estate-matching";
import { requireWorkspace } from "@/services/workspace";

import {
  addLeadNote,
  deleteLead,
  qualifyLead,
  recommendProperty,
  saveRealEstateLeadProfile,
  setLeadArchived,
  updatePropertyMatchStatus,
} from "../actions";

type LeadPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ error?: string; message?: string }>;
};

export async function generateMetadata({
  params,
}: LeadPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Lead ${id.slice(0, 8)}` };
}

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

export default async function LeadPage({
  params,
  searchParams,
}: LeadPageProps) {
  const { id } = await params;
  const notice = searchParams ? await searchParams : {};
  const { organization } = await requireWorkspace();
  const lead = await getLeadDetail(organization.id, id);
  if (!lead) notFound();
  const realEstateData =
    organization.vertical === "real_estate"
      ? await getLeadRealEstateData(organization.id, lead.id)
      : null;

  return (
    <div className="mx-auto max-w-[1380px] p-4 sm:p-6 lg:p-8">
      <Link
        href="/leads"
        className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="size-3.5" /> Voltar para leads
      </Link>

      {(notice.error || notice.message) && (
        <p
          role="status"
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${notice.error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
        >
          {notice.error ?? notice.message}
        </p>
      )}

      <header className="mt-5 flex flex-col gap-5 rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-sm font-semibold text-brand-dark">
            {initials(lead.name)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-[-0.035em] text-gray-950">
                {lead.name}
              </h1>
              <span
                className={cn(
                  "rounded-md px-2 py-1 text-[10px] font-medium",
                  priorityStyles[lead.priority],
                )}
              >
                {priorityLabels[lead.priority]}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {lead.company || "Sem empresa informada"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-gray-500">
              {lead.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="size-3.5" /> {lead.email}
                </span>
              )}
              {lead.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5" /> {lead.phone}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:text-right">
          <Link
            href={`/leads/${lead.id}/edit`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <Pencil className="size-3.5" /> Editar
          </Link>
          <form action={setLeadArchived}>
            <input type="hidden" name="leadId" value={lead.id} />
            <input
              type="hidden"
              name="archived"
              value={lead.archived_at ? "false" : "true"}
            />
            <button className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50">
              <Archive className="size-3.5" />
              {lead.archived_at ? "Restaurar" : "Arquivar"}
            </button>
          </form>
          {["owner", "admin"].includes(organization.role) && (
            <form action={deleteLead}>
              <input type="hidden" name="leadId" value={lead.id} />
              <button
                className="inline-flex size-8 items-center justify-center rounded-lg border border-red-100 text-red-500 hover:bg-red-50"
                aria-label="Excluir lead"
              >
                <Trash2 className="size-3.5" />
              </button>
            </form>
          )}
          <div className="ml-1 flex items-center gap-3">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: lead.stage.color }}
            />
            <div>
              <p className="text-[10px] font-medium tracking-wide text-gray-400 uppercase">
                Etapa atual
              </p>
              <p className="mt-0.5 text-sm font-semibold text-gray-800">
                {lead.stage.name}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_350px]">
        <div className="space-y-5">
          {realEstateData && (
            <LeadRealEstatePanel
              leadId={lead.id}
              data={realEstateData}
              saveProfileAction={saveRealEstateLeadProfile}
              recommendPropertyAction={recommendProperty}
              updateMatchStatusAction={updatePropertyMatchStatus}
            />
          )}
          <section className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs sm:p-6">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-brand" />
              <h2 className="text-sm font-semibold text-gray-900">
                Resumo da oportunidade
              </h2>
            </div>
            <p className="mt-4 text-sm leading-7 text-gray-600">
              {lead.summary ||
                "Ainda não há um resumo registrado para este lead."}
            </p>
            <div className="mt-5 flex items-start gap-3 rounded-lg bg-brand-soft/70 p-3.5">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-brand-dark" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold tracking-wide text-brand-dark uppercase">
                  Próxima ação
                </p>
                <p className="mt-1 text-xs font-medium text-gray-900">
                  {lead.next_action || "Defina a próxima ação comercial"}
                </p>
                {lead.next_action_at && (
                  <p className="mt-1 text-[10px] text-gray-500">
                    Prazo: {formatDate(lead.next_action_at)}
                  </p>
                )}
                <NextActionForm
                  leadId={lead.id}
                  action={lead.next_action ?? ""}
                  hasScheduledAction={Boolean(lead.next_action_at)}
                />
                <Link
                  href={`/calendar?leadId=${lead.id}`}
                  className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg bg-gray-950 px-3 text-xs font-medium text-white hover:bg-gray-800"
                >
                  <CalendarClock className="size-3.5" /> Agendar reunião
                </Link>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <NotebookPen className="size-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-900">Notas</h2>
              </div>
              <span className="text-[10px] text-gray-400">
                {lead.notes.length} registradas
              </span>
            </div>
            <form action={addLeadNote} className="mt-4">
              <input type="hidden" name="leadId" value={lead.id} />
              <Textarea
                name="content"
                rows={3}
                maxLength={5000}
                placeholder="Adicione contexto para o time..."
                required
              />
              <div className="mt-2 flex justify-end">
                <button className="h-8 rounded-lg bg-gray-950 px-3 text-xs font-medium text-white hover:bg-gray-800">
                  Adicionar nota
                </button>
              </div>
            </form>
            {lead.notes.length > 0 && (
              <div className="mt-5 space-y-3 border-t border-gray-100 pt-5">
                {lead.notes.map((note) => (
                  <article
                    key={note.id}
                    className="rounded-lg bg-gray-50 p-3.5"
                  >
                    <p className="whitespace-pre-wrap text-xs leading-5 text-gray-600">
                      {note.content}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[9px] text-gray-400">
                      <span>{note.author_name || "Usuário"}</span>
                      <time dateTime={note.created_at}>
                        {formatDate(note.created_at)}
                      </time>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs sm:p-6">
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-900">Timeline</h2>
              <p className="mt-1 text-xs text-gray-400">
                Histórico imutável de eventos deste lead
              </p>
            </div>
            <EventTimeline events={lead.events} />
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-semibold text-gray-900">Detalhes</h2>
            <dl className="mt-5 space-y-4">
              <Detail
                icon={Building2}
                label="Empresa"
                value={lead.company || "Não informada"}
              />
              <Detail
                icon={CircleDollarSign}
                label="Valor estimado"
                value={formatCurrency(lead.estimated_budget)}
              />
              <Detail
                icon={Sparkles}
                label="Serviço"
                value={lead.service?.name || "Não informado"}
              />
              <Detail
                icon={UserRound}
                label="Responsável"
                value={lead.owner?.full_name || "Sem responsável"}
              />
              <Detail
                icon={Flag}
                label="Origem"
                value={lead.source || "Direto"}
              />
            </dl>
          </section>

          <section className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Score</h2>
              <span className="text-lg font-semibold text-gray-900">
                {lead.score}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${lead.score}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] text-gray-400">
              Estado da análise: {lead.ai_status}
            </p>
            <form action={qualifyLead} className="mt-4">
              <input type="hidden" name="leadId" value={lead.id} />
              <button className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-gray-950 px-3 text-xs font-medium text-white hover:bg-gray-800">
                <Sparkles className="size-3.5" /> Qualificar com IA
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-semibold text-gray-900">Tags</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {lead.tags.length ? (
                lead.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded-md px-2 py-1 text-[10px] font-medium"
                    style={{
                      backgroundColor: `${tag.color}18`,
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                  </span>
                ))
              ) : (
                <p className="text-xs text-gray-400">Nenhuma tag adicionada.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <dt className="text-[9px] font-medium tracking-wide text-gray-400 uppercase">
          {label}
        </dt>
        <dd className="mt-1 truncate text-xs font-medium text-gray-700">
          {value}
        </dd>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
