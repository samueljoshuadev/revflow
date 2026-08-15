import { ArrowRight, Building2, Check, House, ShieldCheck } from "lucide-react";

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
            Configure sua operação
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Escolha o modelo da empresa. O RevFlow configura a identidade e o
            pipeline adequados sem misturar seus dados.
          </p>

          {error && (
            <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <form action={createOrganization} className="mt-7">
            <fieldset>
              <legend className="text-xs font-medium text-gray-700">
                Qual é o tipo da sua empresa?
              </legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <label className="relative cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition has-[:checked]:border-violet-400 has-[:checked]:bg-violet-50">
                  <input
                    type="radio"
                    name="vertical"
                    value="agency"
                    defaultChecked
                    className="sr-only"
                  />
                  <Building2 className="size-5 text-violet-600" />
                  <span className="mt-3 block text-sm font-semibold text-gray-900">
                    Agência
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-gray-500">
                    Leads, propostas, clientes e projetos.
                  </span>
                </label>
                <label className="relative cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition has-[:checked]:border-amber-400 has-[:checked]:bg-[#FFF6D8]">
                  <input
                    type="radio"
                    name="vertical"
                    value="real_estate"
                    className="sr-only"
                  />
                  <House className="size-5 text-[#C77B08]" />
                  <span className="mt-3 block text-sm font-semibold text-gray-900">
                    Imobiliária
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-gray-500">
                    Imóveis, visitas, corretores e matching.
                  </span>
                </label>
              </div>
            </fieldset>
            <div className="mt-5">
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
            </div>
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
