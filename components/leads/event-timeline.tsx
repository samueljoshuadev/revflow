import {
  Bot,
  CalendarCheck,
  CheckCircle2,
  CircleDot,
  FileCheck2,
  Link2,
  MessageCircle,
  MoveRight,
  NotebookPen,
  Trophy,
  UserPlus,
  XCircle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Json, Tables } from "@/types/database";

const eventCopy: Record<
  string,
  { label: string; icon: typeof CircleDot; tone: string }
> = {
  lead_created: {
    label: "Lead criado",
    icon: UserPlus,
    tone: "bg-blue-50 text-blue-600",
  },
  link_clicked: {
    label: "Link acessado",
    icon: Link2,
    tone: "bg-cyan-50 text-cyan-600",
  },
  form_started: {
    label: "Cadastro iniciado",
    icon: FileCheck2,
    tone: "bg-sky-50 text-sky-600",
  },
  form_completed: {
    label: "Cadastro concluído",
    icon: CheckCircle2,
    tone: "bg-indigo-50 text-indigo-600",
  },
  ai_qualified: {
    label: "Lead qualificado pela IA",
    icon: Bot,
    tone: "bg-violet-50 text-violet-600",
  },
  whatsapp_contacted: {
    label: "Contato iniciado no WhatsApp",
    icon: MessageCircle,
    tone: "bg-emerald-50 text-emerald-600",
  },
  message_sent: {
    label: "Mensagem enviada",
    icon: MessageCircle,
    tone: "bg-emerald-50 text-emerald-600",
  },
  message_received: {
    label: "Mensagem recebida",
    icon: MessageCircle,
    tone: "bg-emerald-50 text-emerald-600",
  },
  meeting_booked: {
    label: "Reunião agendada",
    icon: CalendarCheck,
    tone: "bg-purple-50 text-purple-600",
  },
  meeting_cancelled: {
    label: "Reunião cancelada",
    icon: XCircle,
    tone: "bg-red-50 text-red-600",
  },
  meeting_completed: {
    label: "Reunião realizada",
    icon: CheckCircle2,
    tone: "bg-green-50 text-green-600",
  },
  proposal_sent: {
    label: "Proposta enviada",
    icon: FileCheck2,
    tone: "bg-amber-50 text-amber-600",
  },
  negotiation_started: {
    label: "Negociação iniciada",
    icon: MoveRight,
    tone: "bg-orange-50 text-orange-600",
  },
  deal_won: {
    label: "Negócio fechado",
    icon: Trophy,
    tone: "bg-emerald-50 text-emerald-600",
  },
  deal_lost: {
    label: "Negócio perdido",
    icon: XCircle,
    tone: "bg-red-50 text-red-600",
  },
  stage_changed: {
    label: "Etapa alterada",
    icon: MoveRight,
    tone: "bg-violet-50 text-violet-600",
  },
  note_added: {
    label: "Nota adicionada",
    icon: NotebookPen,
    tone: "bg-gray-100 text-gray-600",
  },
};

export function EventTimeline({ events }: { events: Tables<"lead_events">[] }) {
  if (events.length === 0) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-xs text-gray-400">
        Nenhum evento registrado
      </div>
    );
  }

  return (
    <ol className="relative space-y-0">
      {events.map((event, index) => {
        const copy = eventCopy[event.event_type] ?? {
          label: humanize(event.event_type),
          icon: CircleDot,
          tone: "bg-gray-100 text-gray-600",
        };
        const Icon = copy.icon;
        const detail = eventDetail(event.event_type, event.metadata);

        return (
          <li key={event.id} className="relative flex gap-3 pb-6 last:pb-0">
            {index < events.length - 1 && (
              <span className="absolute top-8 bottom-0 left-[15px] w-px bg-gray-100" />
            )}
            <span
              className={cn(
                "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full",
                copy.tone,
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-gray-800">
                  {copy.label}
                </p>
                <time
                  className="text-[10px] text-gray-400"
                  dateTime={event.created_at}
                >
                  {formatEventDate(event.created_at)}
                </time>
              </div>
              {detail && (
                <p className="mt-1 text-[11px] leading-5 text-gray-500">
                  {detail}
                </p>
              )}
              <p className="mt-1 text-[9px] font-medium tracking-wide text-gray-300 uppercase">
                {sourceLabel(event.source)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function eventDetail(type: string, metadata: Json) {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== "object")
    return null;

  if (type === "stage_changed") {
    const from = metadata.from_stage_name;
    const to = metadata.to_stage_name;
    if (typeof from === "string" && typeof to === "string")
      return `${from} → ${to}`;
  }
  return null;
}

function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function sourceLabel(source: Tables<"lead_events">["source"]) {
  const labels = {
    system: "Sistema",
    user: "Usuário",
    webhook: "Webhook",
    api: "API",
    automation: "Automação",
    ai: "IA",
  };
  return labels[source];
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
