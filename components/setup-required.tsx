import { ArrowRight, ArrowUpRight, Database, LockKeyhole } from "lucide-react";

import { Brand } from "@/components/brand";

export function SetupRequired() {
  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#0a0c15] px-6 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(125,111,255,0.28),transparent_30%),radial-gradient(circle_at_20%_80%,rgba(16,185,129,0.08),transparent_28%)]" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col">
        <Brand inverse />
        <div className="grid flex-1 items-center gap-16 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="max-w-2xl animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-violet-200">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Fundação do CRM pronta
            </span>
            <h1 className="mt-6 text-4xl leading-[1.08] font-semibold tracking-[-0.045em] text-balance sm:text-6xl">
              O pipeline que se move quando o negócio acontece.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">
              Kanban, histórico de eventos e isolamento multiempresa preparados
              para transformar cada interação em contexto comercial confiável.
            </p>
            <div className="mt-9 flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                Next.js + TypeScript
              </span>
              <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                Supabase + PostgreSQL
              </span>
              <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                RLS por organização
              </span>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.055] p-2 shadow-2xl shadow-violet-950/20 backdrop-blur">
            <div className="rounded-[20px] bg-white p-6 text-gray-900 sm:p-8">
              <div className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-brand">
                <Database className="size-5" aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-xl font-semibold tracking-tight">
                Conecte seu projeto Supabase
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                O app não usa métricas ou leads fictícios. Para iniciar, aplique
                a migration e configure as duas variáveis públicas descritas em
                <code className="mx-1 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">
                  .env.example
                </code>
                .
              </p>
              <ol className="mt-6 space-y-4 text-sm">
                {[
                  "Crie ou conecte um projeto no Supabase",
                  "Aplique todas as migrations de supabase/migrations em ordem",
                  "Copie .env.example para .env.local e preencha as chaves",
                ].map((item, index) => (
                  <li key={item} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-950 text-[11px] font-semibold text-white">
                      {index + 1}
                    </span>
                    <span className="pt-0.5 text-gray-600">{item}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-7 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
                <span className="flex items-center gap-2">
                  <LockKeyhole className="size-4 text-emerald-600" />
                  Nenhum secret vai para o navegador
                </span>
                <ArrowRight className="size-4" />
              </div>
            </div>
          </section>
        </div>
        <p className="flex items-center gap-2 text-xs text-slate-600">
          <ArrowUpRight className="size-3.5" /> RevFlow · Revenue operations em movimento
        </p>
      </div>
    </main>
  );
}
