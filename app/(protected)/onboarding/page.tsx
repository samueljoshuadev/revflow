import { ArrowRight, Building2, Check, ShieldCheck } from "lucide-react";

import { Brand } from "@/components/brand";
import { Input, Label } from "@/components/ui/field";

import { createOrganization } from "./actions";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f6fa] p-6">
      <div className="w-full max-w-lg animate-fade-up">
        <div className="mb-8 flex justify-center">
          <Brand />
        </div>
        <section className="rounded-2xl border border-gray-200/80 bg-white p-7 shadow-xl shadow-gray-200/40 sm:p-9">
          <div className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-brand">
            <Building2 className="size-5" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-[-0.035em] text-gray-950">
            Configure sua agência
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Vamos criar seu ambiente isolado, o pipeline comercial e os serviços
            iniciais.
          </p>

          {error && (
            <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <form action={createOrganization} className="mt-7">
            <Label htmlFor="name">Nome da agência ou empresa</Label>
            <Input
              id="name"
              name="name"
              placeholder="Ex.: Norte Studio"
              minLength={2}
              maxLength={120}
              autoFocus
              required
            />
            <button className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-medium text-white shadow-sm transition hover:bg-brand-dark">
              Criar meu workspace
              <ArrowRight className="size-4" />
            </button>
          </form>

          <div className="mt-7 grid gap-3 border-t border-gray-100 pt-6 sm:grid-cols-2">
            <p className="flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck className="size-4 text-emerald-600" /> Dados isolados
              por RLS
            </p>
            <p className="flex items-center gap-2 text-xs text-gray-500">
              <Check className="size-4 text-emerald-600" /> Pipeline pronto para
              usar
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
