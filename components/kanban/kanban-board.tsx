"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CircleAlert, Search } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { moveLeadStage } from "@/app/(protected)/(workspace)/pipeline/actions";
import { LeadCard } from "@/components/kanban/lead-card";
import { cn, formatCurrency } from "@/lib/utils";
import type { BoardStage, PipelineBoard } from "@/types/crm";

export function KanbanBoard({ initialBoard }: { initialBoard: PipelineBoard }) {
  const [stages, setStages] = useState(initialBoard.stages);
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("all");
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const activeLead = useMemo(
    () =>
      stages
        .flatMap((stage) => stage.leads)
        .find((lead) => lead.id === activeLeadId) ?? null,
    [activeLeadId, stages],
  );

  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const visibleStages = stages.map((stage) => ({
    ...stage,
    leads: stage.leads.filter((lead) => {
      const matchesPriority = priority === "all" || lead.priority === priority;
      const matchesQuery =
        !normalizedQuery ||
        [lead.name, lead.company, lead.service_name, lead.source]
          .filter(Boolean)
          .some((value) =>
            value?.toLocaleLowerCase("pt-BR").includes(normalizedQuery),
          );
      return matchesPriority && matchesQuery;
    }),
  }));

  function handleDragStart(event: DragStartEvent) {
    const leadId = event.active.data.current?.leadId;
    if (typeof leadId === "string") setActiveLeadId(leadId);
    setFeedback(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveLeadId(null);
    const leadId = event.active.data.current?.leadId;
    const fromStageId = event.active.data.current?.stageId;
    const overStageId = event.over?.data.current?.stageId;
    const overId = String(event.over?.id ?? "");
    const toStageId =
      typeof overStageId === "string"
        ? overStageId
        : overId.startsWith("stage:")
          ? overId.replace("stage:", "")
          : null;

    if (
      typeof leadId !== "string" ||
      typeof fromStageId !== "string" ||
      !toStageId ||
      fromStageId === toStageId
    ) {
      return;
    }

    const snapshot = stages;
    setStages((current) =>
      moveLocally(current, leadId, fromStageId, toStageId),
    );

    startTransition(() => {
      void moveLeadStage({ leadId, toStageId }).then((result) => {
        if (!result.ok) {
          setStages(snapshot);
          setFeedback(result.error);
        }
      });
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-3 border-y border-gray-200/80 bg-white px-4 py-3 sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-8 w-full rounded-lg border border-gray-200 bg-white pr-3 pl-8 text-xs placeholder:text-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            placeholder="Filtrar neste pipeline"
            aria-label="Filtrar leads no pipeline"
          />
        </div>
        <select
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
          className="h-8 rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          aria-label="Filtrar por prioridade"
        >
          <option value="all">Todas as prioridades</option>
          <option value="urgent">Urgente</option>
          <option value="high">Alta</option>
          <option value="medium">Média</option>
          <option value="low">Baixa</option>
        </select>
        <span className="ml-auto text-[10px] text-gray-400">
          {isPending
            ? "Salvando movimentação..."
            : `${stages.reduce((total, stage) => total + stage.leads.length, 0)} leads`}
        </span>
      </div>

      {feedback && (
        <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 sm:mx-6 lg:mx-8">
          <CircleAlert className="size-4" /> {feedback}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveLeadId(null)}
      >
        <div className="flex min-h-[calc(100vh-218px)] gap-3 overflow-x-auto px-4 py-5 sm:px-6 lg:px-8">
          {visibleStages.map((stage) => (
            <KanbanColumn key={stage.id} stage={stage} />
          ))}
        </div>
        <DragOverlay>
          {activeLead ? <LeadCard lead={activeLead} overlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function KanbanColumn({ stage }: { stage: BoardStage }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage:${stage.id}`,
    data: { type: "stage", stageId: stage.id },
  });
  const stageValue = stage.leads.reduce(
    (sum, lead) => sum + (lead.estimated_budget ?? 0),
    0,
  );

  return (
    <section className="w-[302px] shrink-0" aria-label={`Etapa ${stage.name}`}>
      <div className="mb-3 px-1">
        <div className="flex items-center gap-2">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <h2 className="text-xs font-semibold text-gray-700">{stage.name}</h2>
          <span className="rounded-full bg-gray-200/70 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500">
            {stage.leads.length}
          </span>
          <span className="ml-auto text-[9px] font-medium text-gray-400">
            {formatCurrency(stageValue)}
          </span>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[180px] space-y-2.5 rounded-xl border border-transparent p-1.5 transition-colors",
          isOver && "border-violet-200 bg-violet-50/50",
        )}
      >
        <SortableContext
          items={stage.leads.map((lead) => `lead:${lead.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {stage.leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </SortableContext>
        {stage.leads.length === 0 && (
          <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white/50 text-[10px] text-gray-400">
            Arraste um lead para cá
          </div>
        )}
      </div>
    </section>
  );
}

function moveLocally(
  stages: BoardStage[],
  leadId: string,
  fromStageId: string,
  toStageId: string,
) {
  const lead = stages
    .find((stage) => stage.id === fromStageId)
    ?.leads.find((item) => item.id === leadId);
  if (!lead) return stages;

  return stages.map((stage) => {
    if (stage.id === fromStageId) {
      return {
        ...stage,
        leads: stage.leads.filter((item) => item.id !== leadId),
      };
    }
    if (stage.id === toStageId) {
      return {
        ...stage,
        leads: [{ ...lead, stage_id: toStageId }, ...stage.leads],
      };
    }
    return stage;
  });
}
