"use client";

import { useState } from "react";

import {
  clearNextAction,
  scheduleNextAction,
} from "@/app/(protected)/(workspace)/leads/actions";

export function NextActionForm({
  leadId,
  action,
  hasScheduledAction,
}: {
  leadId: string;
  action: string;
  hasScheduledAction: boolean;
}) {
  const [localDate, setLocalDate] = useState("");
  const dueAt = localDate ? new Date(localDate).toISOString() : "";
  return (
    <div className="mt-3 space-y-2">
      <form
        action={scheduleNextAction}
        className="grid gap-2 sm:grid-cols-[1fr_190px_auto]"
      >
        <input type="hidden" name="leadId" value={leadId} />
        <input type="hidden" name="dueAt" value={dueAt} />
        <input
          name="action"
          defaultValue={action}
          maxLength={500}
          placeholder="Ex.: retornar proposta"
          required
          className="h-9 rounded-lg border border-brand/20 bg-white px-3 text-xs"
        />
        <input
          value={localDate}
          onChange={(event) => setLocalDate(event.target.value)}
          type="datetime-local"
          required
          className="h-9 rounded-lg border border-brand/20 bg-white px-3 text-xs"
        />
        <button
          disabled={!dueAt}
          className="h-9 rounded-lg border border-brand/20 bg-white px-3 text-xs font-medium text-brand-dark disabled:opacity-50"
        >
          {hasScheduledAction ? "Adiar" : "Programar"}
        </button>
      </form>
      {hasScheduledAction && (
        <form action={clearNextAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="leadId" value={leadId} />
          <button
            name="outcome"
            value="completed"
            className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800"
          >
            Marcar como concluída
          </button>
          <button
            name="outcome"
            value="cancelled"
            className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600"
          >
            Cancelar ação
          </button>
        </form>
      )}
    </div>
  );
}
