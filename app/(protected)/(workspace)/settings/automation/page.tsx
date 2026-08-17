import {
  Bot,
  Braces,
  CalendarClock,
  ExternalLink,
  FormInput,
} from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { CaptureSourceForm } from "@/components/settings/capture-source-form";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/services/workspace";

import { createFollowUpRule, toggleCaptureSource, toggleRule } from "./actions";

export const metadata = { title: "Automações comerciais" };

const triggerLabels = {
  first_contact: "Primeiro contato",
  return: "Retorno programado",
  proposal: "Proposta sem retorno",
  reactivation: "Reativação",
  stale: "Lead parado",
};
const kanbanLabels = {
  lead_created: "Lead criado",
  meeting_scheduled: "Reunião agendada",
  meeting_completed: "Reunião concluída",
  proposal_sent: "Proposta enviada",
  proposal_accepted: "Proposta aceita",
  proposal_rejected: "Proposta recusada",
};

export default async function AutomationSettingsPage() {
  const { organization } = await requireWorkspace();
  const supabase = await createClient();
  const [sources, followUps, kanban, services, members] = await Promise.all([
    supabase
      .from("lead_capture_sources")
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("follow_up_rules")
      .select("*")
      .eq("organization_id", organization.id)
      .order("created_at")
      .limit(100),
    supabase
      .from("kanban_automation_rules")
      .select("*")
      .eq("organization_id", organization.id)
      .order("event_key")
      .limit(20),
    supabase
      .from("services")
      .select("id, name")
      .eq("organization_id", organization.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organization.id)
      .limit(200),
  ]);
  const error =
    sources.error ??
    followUps.error ??
    kanban.error ??
    services.error ??
    members.error;
  if (error) throw error;
  const ids = (members.data ?? []).map((member) => member.user_id);
  const profiles = ids.length
    ? await supabase.from("profiles").select("id, full_name").in("id", ids)
    : { data: [], error: null };
  if (profiles.error) throw profiles.error;
  const names = new Map(
    (profiles.data ?? []).map((profile) => [profile.id, profile.full_name]),
  );
  const memberOptions = (members.data ?? []).map((member) => ({
    id: member.user_id,
    name: names.get(member.user_id) || "Membro da equipe",
  }));
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const canAdmin = ["owner", "admin"].includes(organization.role);

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Operação comercial"
        title="Entradas e automações"
        description="Configure como os leads chegam, quando sua equipe é lembrada e quais eventos movimentam o pipeline."
      />

      <Section
        icon={FormInput}
        title="Entrada de leads"
        description="Formulários e webhooks isolados para esta organização."
      >
        {canAdmin && (
          <CaptureSourceForm
            services={services.data ?? []}
            members={memberOptions}
          />
        )}
        <div className="mt-6 divide-y divide-gray-100 border-t border-gray-100">
          {(sources.data ?? []).map((source) => {
            const url =
              source.channel === "form"
                ? `${appUrl}/capture/${organization.slug}/${source.source_key}`
                : `${appUrl}/api/public/leads/${organization.slug}/${source.source_key}`;
            return (
              <div
                key={source.id}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">
                      {source.name}
                    </p>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                      {source.channel === "form" ? "Formulário" : "Webhook"}
                    </span>
                  </div>
                  <p className="mt-1 break-all font-mono text-[11px] text-gray-400">
                    {url}
                  </p>
                  {source.token_hint && (
                    <p className="mt-1 text-[11px] text-gray-400">
                      Token termina em {source.token_hint}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {source.channel === "form" && (
                    <Link
                      href={`/capture/${organization.slug}/${source.source_key}`}
                      target="_blank"
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs text-gray-600"
                    >
                      <ExternalLink className="size-3" /> Abrir
                    </Link>
                  )}
                  {canAdmin && (
                    <form action={toggleCaptureSource}>
                      <input type="hidden" name="id" value={source.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={source.is_active ? "false" : "true"}
                      />
                      <button className="h-8 rounded-lg border border-gray-200 px-3 text-xs text-gray-600">
                        {source.is_active ? "Pausar" : "Ativar"}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
          {(sources.data ?? []).length === 0 && (
            <p className="py-5 text-sm text-gray-400">
              Nenhuma entrada configurada.
            </p>
          )}
        </div>
      </Section>

      <Section
        icon={CalendarClock}
        title="Follow-ups e alertas"
        description="As regras geram notificações internas; e-mail só é marcado como enviado após confirmação do provedor."
      >
        {canAdmin && (
          <form
            action={createFollowUpRule}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <Field name="name" placeholder="Retorno comercial" required />
            <select
              name="triggerKind"
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm"
            >
              <option value="first_contact">Primeiro contato</option>
              <option value="return">Retorno programado</option>
              <option value="proposal">Proposta sem retorno</option>
              <option value="reactivation">Reativação</option>
              <option value="stale">Lead parado</option>
            </select>
            <Field
              name="delayDays"
              type="number"
              min={0}
              max={365}
              defaultValue={1}
              required
            />
            <label className="flex h-10 items-center gap-2 rounded-lg border border-gray-200 px-3 text-xs text-gray-600">
              <input type="checkbox" name="notifyEmail" /> Enviar e-mail
            </label>
            <button className="h-10 rounded-lg bg-gray-950 px-4 text-sm font-medium text-white">
              Adicionar regra
            </button>
          </form>
        )}
        <div className="mt-5 divide-y divide-gray-100">
          {(followUps.data ?? []).map((rule) => (
            <RuleRow
              key={rule.id}
              title={rule.name}
              detail={`${triggerLabels[rule.trigger_kind]} · D+${rule.delay_days}${rule.notify_email ? " · e-mail" : " · interno"}`}
              active={rule.is_active}
              table="follow_up_rules"
              id={rule.id}
              canAdmin={canAdmin}
            />
          ))}
          {(followUps.data ?? []).length === 0 && (
            <p className="py-5 text-sm text-gray-400">
              Nenhuma regra criada. O sistema não enviará lembretes
              automaticamente.
            </p>
          )}
        </div>
      </Section>

      <Section
        icon={Bot}
        title="Kanban determinístico"
        description="Movimentos por eventos reais, independentes da OpenAI."
      >
        <div className="divide-y divide-gray-100">
          {(kanban.data ?? []).map((rule) => (
            <RuleRow
              key={rule.id}
              title={kanbanLabels[rule.event_key]}
              detail={`Mover para: ${rule.target_stage_slug}`}
              active={rule.is_active}
              table="kanban_automation_rules"
              id={rule.id}
              canAdmin={canAdmin}
            />
          ))}
          {(kanban.data ?? []).length === 0 && (
            <p className="py-5 text-sm text-gray-400">
              Nenhuma regra encontrou uma etapa compatível no pipeline.
            </p>
          )}
        </div>
      </Section>

      <section className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5 text-xs leading-5 text-blue-900">
        <div className="flex gap-3">
          <Braces className="mt-0.5 size-4 shrink-0" />
          <p>
            Webhooks usam <code>Authorization: Bearer SEU_TOKEN</code> e{" "}
            <code>Idempotency-Key</code>. O corpo aceita name, email, phone,
            company e summary. Nunca coloque o token na URL.
          </p>
        </div>
      </section>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof FormInput;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7 rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Icon className="size-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-gray-950">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
function Field(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-10 rounded-lg border border-gray-200 px-3 text-sm"
    />
  );
}
function RuleRow({
  title,
  detail,
  active,
  table,
  id,
  canAdmin,
}: {
  title: string;
  detail: string;
  active: boolean;
  table: "follow_up_rules" | "kanban_automation_rules";
  id: string;
  canAdmin: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="mt-0.5 text-xs text-gray-400">{detail}</p>
      </div>
      {canAdmin ? (
        <form action={toggleRule}>
          <input type="hidden" name="table" value={table} />
          <input type="hidden" name="id" value={id} />
          <input
            type="hidden"
            name="active"
            value={active ? "false" : "true"}
          />
          <button
            className={`rounded-full px-3 py-1 text-[10px] font-medium ${active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
          >
            {active ? "Ativa" : "Pausada"}
          </button>
        </form>
      ) : (
        <span className="text-xs text-gray-400">
          {active ? "Ativa" : "Pausada"}
        </span>
      )}
    </div>
  );
}
