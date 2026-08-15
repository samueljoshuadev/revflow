"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowUpRight,
  CalendarClock,
  GripVertical,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { cn, formatCurrency, formatRelativeDate, initials } from "@/lib/utils";
import type { BoardLead } from "@/types/crm";

const priorityStyles = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-50 text-blue-700",
  high: "bg-amber-50 text-amber-700",
  urgent: "bg-red-50 text-red-700",
};

const priorityLabels = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  urgent: "Urgente",
};

export function LeadCard({
  lead,
  overlay = false,
  automationPending = false,
  onAutomate,
}: {
  lead: BoardLead;
  overlay?: boolean;
  automationPending?: boolean;
  onAutomate?: (leadId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `lead:${lead.id}`,
    data: { type: "lead", leadId: lead.id, stageId: lead.stage_id },
    disabled: overlay || automationPending,
  });

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group rounded-xl border border-gray-200/90 bg-white p-3.5 shadow-xs transition-shadow hover:shadow-md hover:shadow-gray-200/60",
        isDragging && "opacity-30",
        overlay && "w-[286px] rotate-2 shadow-xl",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          className="-ml-1 cursor-grab rounded p-1 text-gray-300 opacity-0 transition group-hover:opacity-100 hover:bg-gray-50 hover:text-gray-500 active:cursor-grabbing focus:opacity-100"
          aria-label={`Mover ${lead.name}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>
        <Link href={`/leads/${lead.id}`} className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[13px] font-semibold text-gray-900">
                {lead.name}
              </h3>
              <p className="mt-0.5 truncate text-[11px] text-gray-400">
                {lead.company || "Sem empresa"}
              </p>
            </div>
            <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-gray-300 opacity-0 transition group-hover:opacity-100" />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {lead.service_name && (
              <span className="max-w-[145px] truncate rounded-md bg-violet-50 px-1.5 py-1 text-[9px] font-medium text-violet-700">
                {lead.service_name}
              </span>
            )}
            <span
              className={cn(
                "rounded-md px-1.5 py-1 text-[9px] font-medium",
                priorityStyles[lead.priority],
              )}
            >
              {priorityLabels[lead.priority]}
            </span>
            {lead.score > 0 && (
              <span className="rounded-md bg-gray-50 px-1.5 py-1 text-[9px] font-medium text-gray-500">
                Score {lead.score}
              </span>
            )}
          </div>

          <p className="mt-3 text-[13px] font-semibold text-gray-800">
            {formatCurrency(lead.estimated_budget)}
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2.5">
            <div className="flex min-w-0 items-center gap-1.5 text-[10px] text-gray-400">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[8px] font-semibold text-gray-500">
                {lead.owner_name ? initials(lead.owner_name) : "—"}
              </span>
              <span className="max-w-[80px] truncate">
                {lead.source || "Direto"}
              </span>
            </div>
            <span
              className="flex items-center gap-1 text-[9px] text-gray-400"
              title={lead.next_action ?? undefined}
            >
              <CalendarClock className="size-3" />
              {formatRelativeDate(lead.last_interaction_at ?? lead.updated_at)}
            </span>
          </div>
          {lead.next_action && (
            <p className="mt-2 truncate rounded-md bg-gray-50 px-2 py-1.5 text-[9px] text-gray-500">
              Próximo: {lead.next_action}
            </p>
          )}
        </Link>
      </div>
      {!overlay && onAutomate && (
        <button
          type="button"
          onClick={() => onAutomate(lead.id)}
          disabled={automationPending}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-100 bg-violet-50/70 px-2.5 py-2 text-[10px] font-semibold text-violet-700 transition hover:border-violet-200 hover:bg-violet-100 disabled:cursor-wait disabled:opacity-60"
          aria-label={`Qualificar ${lead.name} com inteligência artificial`}
        >
          {automationPending ? (
            <LoaderCircle className="size-3 animate-spin" />
          ) : (
            <Sparkles className="size-3" />
          )}
          {automationPending
            ? "Analisando com IA..."
            : "Qualificar e atualizar Kanban"}
        </button>
      )}
    </article>
  );
}
