import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Brand } from "@/components/brand";
import { Input, Label } from "@/components/ui/field";
import { isSupabaseConfigured } from "@/lib/env";

import { requestPasswordReset, signIn, signUp } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    next?: string;
    mode?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const isSignUp = params.mode === "signup";
  const isForgot = params.mode === "forgot";

  if (!isSupabaseConfigured()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 p-6 text-white">
        <div className="max-w-md rounded-2xl border border-white/10 bg-white/5 p-8">
          <Brand inverse />
          <h1 className="mt-8 text-2xl font-semibold">
            Supabase ainda não configurado
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            Preencha as variáveis de ambiente descritas em .env.example para
            habilitar o acesso.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[0.95fr_1.05fr]">
      <section className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm animate-fade-up">
          <Brand />
          <div className="mt-12">
            <p className="text-xs font-semibold tracking-[0.16em] text-brand uppercase">
              {isForgot
                ? "Recuperar acesso"
                : isSignUp
                  ? "Comece agora"
                  : "Área segura"}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-950">
              {isForgot
                ? "Redefina sua senha"
                : isSignUp
                  ? "Crie sua conta"
                  : "Bem-vindo de volta"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              {isForgot
                ? "Informe seu e-mail e enviaremos um link seguro, caso a conta exista."
                : isSignUp
                  ? "Configure sua agência e organize o comercial em poucos minutos."
                  : "Entre para acompanhar seu pipeline e as próximas oportunidades."}
            </p>
          </div>

          {(params.error || params.message) && (
            <div
              className={`mt-6 rounded-lg border px-3 py-2.5 text-sm ${
                params.error
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {params.error ?? params.message}
            </div>
          )}

          <form
            action={
              isForgot ? requestPasswordReset : isSignUp ? signUp : signIn
            }
            className="mt-7 space-y-4"
          >
            {isSignUp && (
              <div>
                <Label htmlFor="fullName">Seu nome</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  autoComplete="name"
                  required
                />
              </div>
            )}
            {!isForgot && (
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>
            )}
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
              />
            </div>
            {!isSignUp && (
              <input type="hidden" name="next" value={params.next ?? ""} />
            )}
            <button className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gray-950 text-sm font-medium text-white transition hover:bg-gray-800">
              {isForgot
                ? "Enviar instruções"
                : isSignUp
                  ? "Criar conta"
                  : "Entrar"}
              <ArrowRight className="size-4" />
            </button>
          </form>
          {!isSignUp && !isForgot && (
            <p className="mt-3 text-center text-sm">
              <a
                className="text-gray-500 hover:text-brand"
                href="/login?mode=forgot"
              >
                Esqueci minha senha
              </a>
            </p>
          )}
          <p className="mt-6 text-center text-sm text-gray-500">
            {isForgot
              ? "Lembrou sua senha?"
              : isSignUp
                ? "Já tem uma conta?"
                : "Primeiro acesso?"}{" "}
            <a
              className="font-medium text-brand hover:text-brand-dark"
              href={isSignUp || isForgot ? "/login" : "/login?mode=signup"}
            >
              {isSignUp || isForgot ? "Entrar" : "Criar conta"}
            </a>
          </p>
        </div>
      </section>

      <section className="relative hidden overflow-hidden bg-[#0d1019] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_60%_35%,rgba(109,93,252,0.28),transparent_32%)]" />
        <p className="relative text-sm font-medium text-white/50">
          Pipeline em movimento
        </p>
        <div className="relative mx-auto w-full max-w-xl">
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-2xl backdrop-blur">
            <div className="rounded-xl bg-white p-5 text-gray-900">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <p className="text-xs text-gray-400">Pipeline comercial</p>
                  <p className="mt-1 font-semibold">Oportunidades ativas</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  Em tempo real
                </span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {["Novo lead", "Qualificado", "Proposta"].map(
                  (stage, index) => (
                    <div key={stage} className="rounded-lg bg-gray-50 p-3">
                      <p className="text-[11px] font-medium text-gray-500">
                        {stage}
                      </p>
                      <div className="mt-3 space-y-2">
                        {[0, 1].slice(0, index === 1 ? 1 : 2).map((item) => (
                          <div
                            key={item}
                            className="rounded-md border border-gray-100 bg-white p-2.5 shadow-xs"
                          >
                            <div className="h-2 w-2/3 rounded bg-gray-200" />
                            <div className="mt-2 h-1.5 w-1/2 rounded bg-gray-100" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-4 text-sm text-slate-300">
            <p className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-400" /> Eventos
              imutáveis
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-400" /> Auditoria
              completa
            </p>
          </div>
        </div>
        <p className="relative max-w-md text-xl leading-8 font-medium text-slate-300">
          “Menos status solto. Mais contexto para tomar a próxima decisão.”
        </p>
      </section>
    </main>
  );
}
