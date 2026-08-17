import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type OnboardingItem = {
  label: string;
  complete: boolean;
  href: string;
  help: string;
};

export async function getFirstClientOnboardingProgress(
  organization: Tables<"organizations">,
) {
  const supabase = await createClient();
  const [
    services,
    stages,
    members,
    captureSources,
    google,
    imports,
    leads,
    moved,
    meetings,
  ] = await Promise.all([
    count(
      supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.id)
        .eq("is_active", true),
    ),
    count(
      supabase
        .from("pipeline_stages")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.id),
    ),
    count(
      supabase
        .from("organization_members")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.id),
    ),
    count(
      supabase
        .from("lead_capture_sources")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.id)
        .eq("is_active", true),
    ),
    count(
      supabase
        .from("integration_connections")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.id)
        .eq("provider", "google_calendar")
        .eq("status", "connected"),
    ),
    count(
      supabase
        .from("lead_imports")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.id)
        .eq("status", "completed"),
    ),
    count(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.id),
    ),
    count(
      supabase
        .from("lead_events")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.id)
        .eq("event_type", "stage_changed"),
    ),
    count(
      supabase
        .from("meetings")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organization.id),
    ),
  ]);
  const settings =
    organization.settings &&
    typeof organization.settings === "object" &&
    !Array.isArray(organization.settings)
      ? organization.settings
      : {};
  const lossReasons = Array.isArray(settings.loss_reasons)
    ? settings.loss_reasons.length
    : 0;
  const items: OnboardingItem[] = [
    {
      label: "Dados da empresa",
      complete: Boolean(organization.contact_email && organization.phone),
      href: "/settings",
      help: "Informe contato comercial e telefone.",
    },
    {
      label: "Serviços",
      complete: services > 0,
      href: "/settings",
      help: "Cadastre o que a agência vende.",
    },
    {
      label: "Pipeline e etapas",
      complete: stages >= 3,
      href: "/pipeline",
      help: "Confirme se as etapas representam seu processo.",
    },
    {
      label: "Motivos de perda",
      complete: lossReasons > 0,
      href: "/settings",
      help: "Defina motivos padronizados nas configurações.",
    },
    {
      label: "Origem dos leads",
      complete: captureSources > 0,
      href: "/settings/automation",
      help: "Crie um formulário ou webhook de entrada.",
    },
    {
      label: "Equipe",
      complete: members > 1,
      href: "/team",
      help: "Convide pelo menos uma pessoa da operação.",
    },
    {
      label: "Horários de atendimento",
      complete: Boolean(
        organization.business_hours &&
        typeof organization.business_hours === "object",
      ),
      href: "/settings",
      help: "Confirme o horário usado pela agenda.",
    },
    {
      label: "Google Calendar",
      complete: google > 0,
      href: "/settings/integrations",
      help: "Conecte e teste o calendário.",
    },
    {
      label: "Link público de agenda",
      complete: organization.booking_enabled,
      href: "/settings",
      help: "Ative o agendamento público.",
    },
    {
      label: "Primeiros leads",
      complete: imports > 0 || leads > 0,
      href: "/leads/import",
      help: "Importe CSV ou cadastre o primeiro lead.",
    },
    {
      label: "Primeiro movimento",
      complete: moved > 0,
      href: "/pipeline",
      help: "Movimente um lead quando houver avanço real.",
    },
    {
      label: "Primeira reunião",
      complete: meetings > 0,
      href: "/calendar",
      help: "Agende a primeira reunião.",
    },
  ];
  return {
    items,
    completed: items.filter((item) => item.complete).length,
    percentage: Math.round(
      (items.filter((item) => item.complete).length / items.length) * 100,
    ),
  };
}

async function count(
  query: PromiseLike<{
    count: number | null;
    error: { message: string } | null;
  }>,
) {
  const result = await query;
  if (result.error) throw result.error;
  return result.count ?? 0;
}
