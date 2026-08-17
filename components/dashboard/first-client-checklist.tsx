import { Check, ChevronRight, Circle } from "lucide-react";
import Link from "next/link";

import type { OnboardingItem } from "@/services/onboarding-progress";

export function FirstClientChecklist({
  items,
  completed,
  percentage,
}: {
  items: OnboardingItem[];
  completed: number;
  percentage: number;
}) {
  if (percentage === 100) return null;
  return (
    <section className="mt-7 rounded-xl border border-brand/20 bg-brand-soft/40 p-5 shadow-xs sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-brand uppercase">
            Preparação da agência
          </p>
          <h2 className="mt-1 text-lg font-semibold text-gray-950">
            Checklist do primeiro cliente
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            {completed} de {items.length} etapas concluídas com dados realmente
            persistidos.
          </p>
        </div>
        <div className="min-w-40">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Progresso</span>
            <strong className="text-brand-dark">{percentage}%</strong>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="group flex items-start gap-3 rounded-lg border border-white/80 bg-white/80 p-3 hover:border-brand/20"
          >
            <span
              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${item.complete ? "bg-emerald-100 text-emerald-700" : "text-gray-300"}`}
            >
              {item.complete ? (
                <Check className="size-3" />
              ) : (
                <Circle className="size-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-800">{item.label}</p>
              <p className="mt-1 text-[10px] leading-4 text-gray-400">
                {item.help}
              </p>
            </div>
            <ChevronRight className="mt-1 size-3 text-gray-300 group-hover:text-brand" />
          </Link>
        ))}
      </div>
    </section>
  );
}
