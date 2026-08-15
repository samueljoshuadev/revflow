"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Copy,
  ExternalLink,
  HelpCircle,
  Link2,
  MessageCircle,
  Settings2,
  ShieldCheck,
  TestTube2,
  Unplug,
  X,
} from "lucide-react";
import { useState } from "react";

import {
  disconnectIntegration,
  saveCalendly,
  saveOpenAi,
  saveWhatsApp,
  testIntegration,
} from "@/app/(protected)/(workspace)/settings/integrations/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { IntegrationCardData } from "@/services/integrations";
import type { IntegrationProvider } from "@/services/integrations/credentials";

type Props = {
  cards: IntegrationCardData[];
  canAdmin: boolean;
  vaultConfigured: boolean;
  migrationReady: boolean;
  googleOAuthReady: boolean;
  appUrl: string;
};

const statusStyles: Record<IntegrationCardData["status"], string> = {
  connected: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  connecting: "bg-blue-50 text-blue-700 ring-blue-200",
  incomplete: "bg-amber-50 text-amber-700 ring-amber-200",
  attention: "bg-orange-50 text-orange-700 ring-orange-200",
  expired: "bg-red-50 text-red-700 ring-red-200",
  error: "bg-red-50 text-red-700 ring-red-200",
  revoked: "bg-red-50 text-red-700 ring-red-200",
  disconnected: "bg-gray-50 text-gray-600 ring-gray-200",
};

function ProviderIcon({ provider }: { provider: IntegrationProvider }) {
  const iconClass = "size-5";
  switch (provider) {
    case "google_calendar":
      return <CalendarDays className={iconClass} aria-hidden="true" />;
    case "whatsapp":
      return <MessageCircle className={iconClass} aria-hidden="true" />;
    case "openai":
      return <BrainCircuit className={iconClass} aria-hidden="true" />;
    case "calendly":
      return <Clock3 className={iconClass} aria-hidden="true" />;
  }
}

export function IntegrationCenter({
  cards,
  canAdmin,
  vaultConfigured,
  migrationReady,
  googleOAuthReady,
  appUrl,
}: Props) {
  const [helpProvider, setHelpProvider] = useState<IntegrationProvider | null>(null);
  const [configureProvider, setConfigureProvider] = useState<IntegrationProvider | null>(null);
  const helpCard = cards.find((card) => card.provider === helpProvider);
  const configureCard = cards.find((card) => card.provider === configureProvider);
  const completed = cards.filter((card) => card.status === "connected").length;

  return (
    <>
      {(!migrationReady || !vaultConfigured) && (
        <div className="mt-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Preparação do servidor pendente</p>
            <p className="mt-1 text-xs leading-5 text-amber-800">
              O responsável técnico precisa {!migrationReady ? "aplicar a migration da Central de Integrações" : "ativar o cofre de credenciais"}. Depois disso, os clientes farão todo o restante por esta página.
            </p>
          </div>
        </div>
      )}

      <section className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-gray-950 text-white shadow-sm">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_320px] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-violet-300">
              <ShieldCheck className="size-4" /> Configuração protegida por empresa
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">
              Conecte suas ferramentas sem precisar entender programação.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
              Vamos fazer isso juntos. Normalmente leva poucos minutos. Use o botão de ajuda em qualquer integração para acompanhar cada etapa.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-gray-400">Integrações confirmadas</p>
                <p className="mt-1 text-2xl font-semibold">{completed} de {cards.length}</p>
              </div>
              <span className="text-xs text-gray-400">{Math.round((completed / cards.length) * 100)}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${(completed / cards.length) * 100}%` }} />
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {cards.map((card) => (
          <IntegrationCard
            key={card.provider}
            card={card}
            canAdmin={canAdmin}
            platformReady={migrationReady && vaultConfigured}
            googleOAuthReady={googleOAuthReady}
            appUrl={appUrl}
            onHelp={() => setHelpProvider(card.provider)}
            onConfigure={() => setConfigureProvider(card.provider)}
          />
        ))}
      </div>

      {helpCard && (
        <HelpDialog card={helpCard} onClose={() => setHelpProvider(null)} />
      )}
      {configureCard && (
        <ConfigDialog
          card={configureCard}
          appUrl={appUrl}
          onClose={() => setConfigureProvider(null)}
        />
      )}
    </>
  );
}

function IntegrationCard({
  card,
  canAdmin,
  platformReady,
  googleOAuthReady,
  appUrl,
  onHelp,
  onConfigure,
}: {
  card: IntegrationCardData;
  canAdmin: boolean;
  platformReady: boolean;
  googleOAuthReady: boolean;
  appUrl: string;
  onHelp: () => void;
  onConfigure: () => void;
}) {
  const isConnected = card.status === "connected";
  const canUse = canAdmin && platformReady;
  const googleBlocked = card.provider === "google_calendar" && !googleOAuthReady;
  const webhookUrl = card.connectionId
    ? `${appUrl}/api/webhooks/whatsapp/${card.connectionId}`
    : null;

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl ring-1",
              card.accent,
            )}
            aria-label={card.name}
          >
            <ProviderIcon provider={card.provider} />
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-950">{card.name}</h3>
            <p className="mt-1 text-xs leading-5 text-gray-500">{card.description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onHelp}
          aria-label={`Abrir ajuda do ${card.name}`}
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900"
        >
          <HelpCircle className="size-5" />
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-gray-100 py-4">
        <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset", statusStyles[card.status])}>
          {isConnected ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}
          {card.statusLabel}
        </span>
        <p className="text-[11px] text-gray-400">
          {card.lastTestedAt ? `Testada ${formatDate(card.lastTestedAt)}` : "Ainda não testada"}
        </p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {card.checklist.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs text-gray-600">
            <span className={cn("flex size-5 items-center justify-center rounded-full", item.done ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400")}>
              {item.done ? <Check className="size-3" /> : <Circle className="size-2.5" />}
            </span>
            {item.label}
          </div>
        ))}
      </div>

      {card.secretHint && (
        <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-500">
          Credencial salva: <span className="font-medium text-gray-700">{card.secretHint}</span>
        </p>
      )}
      {card.provider === "whatsapp" && webhookUrl && (
        <CopyLine label="URL do webhook" value={webhookUrl} />
      )}
      {card.lastErrorCode && (
        <details className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-red-700">Deu erro? Ver detalhes</summary>
          <p className="mt-2 break-all font-mono text-[10px] text-red-600">{card.lastErrorCode}</p>
          {card.diagnosticId && <p className="mt-1 text-[10px] text-red-500">Diagnóstico: {card.diagnosticId}</p>}
        </details>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {card.provider === "google_calendar" ? (
          <a
            href="/api/integrations/google/start"
            aria-disabled={!canUse || googleBlocked}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white",
              (!canUse || googleBlocked) && "pointer-events-none opacity-50",
            )}
          >
            <Link2 className="size-4" /> {isConnected ? "Reconectar" : "Conectar"}
          </a>
        ) : (
          <Button type="button" onClick={onConfigure} disabled={!canUse}>
            <Settings2 className="size-4" /> {card.secretHint ? "Configurar" : "Conectar"}
          </Button>
        )}
        <form action={testIntegration}>
          <input type="hidden" name="provider" value={card.provider} />
          <Button variant="secondary" disabled={!canUse || (!card.secretHint && card.provider !== "openai") || googleBlocked}>
            <TestTube2 className="size-4" /> Testar conexão
          </Button>
        </form>
        {(card.secretHint || isConnected) && (
          <form
            action={disconnectIntegration}
            onSubmit={(event) => {
              if (!window.confirm(`Desconectar ${card.name} e remover a credencial protegida?`)) event.preventDefault();
            }}
          >
            <input type="hidden" name="provider" value={card.provider} />
            <Button variant="ghost" disabled={!canAdmin}>
              <Unplug className="size-4" /> Desconectar
            </Button>
          </form>
        )}
      </div>
      {googleBlocked && (
        <p className="mt-3 text-[11px] text-amber-700">O administrador da plataforma ainda precisa cadastrar o aplicativo do Google.</p>
      )}
    </article>
  );
}

function HelpDialog({ card, onClose }: { card: IntegrationCardData; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const current = card.help[step];
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-gray-950/50" role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b border-gray-200 p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold text-brand">AJUDA PASSO A PASSO</p>
            <h2 id="help-title" className="mt-1 text-xl font-semibold text-gray-950">Conectar {card.name}</h2>
            <p className="mt-2 text-sm text-gray-500">Vamos fazer isso juntos. Normalmente leva poucos minutos.</p>
          </div>
          <button onClick={onClose} aria-label="Fechar ajuda" className="flex size-10 items-center justify-center rounded-full hover:bg-gray-100">
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="flex gap-2" aria-label={`Passo ${step + 1} de ${card.help.length}`}>
            {card.help.map((_, index) => (
              <span key={index} className={cn("h-1.5 flex-1 rounded-full", index <= step ? "bg-brand" : "bg-gray-200")} />
            ))}
          </div>
          <div className="mt-8 flex size-12 items-center justify-center rounded-full bg-violet-50 text-lg font-semibold text-brand">{step + 1}</div>
          <h3 className="mt-5 text-lg font-semibold text-gray-950">{current.title}</h3>
          <p className="mt-3 text-sm leading-7 text-gray-600">{current.description}</p>
          {current.link && (
            <a href={current.link.href} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              {current.link.label} <ExternalLink className="size-4" />
            </a>
          )}
          <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-semibold text-blue-900">Importante</p>
            <p className="mt-1 text-xs leading-5 text-blue-700">Não envie tokens, chaves ou senhas por WhatsApp ou e-mail. Cole os valores secretos somente no campo protegido desta página.</p>
          </div>
          <details className="mt-4 rounded-xl border border-gray-200 p-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-800">Deu erro? Veja como resolver</summary>
            <p className="mt-3 text-xs leading-6 text-gray-600">Confira se copiou o valor inteiro, se a conta tem permissão de administrador e se a autorização ainda está válida. Depois use “Testar conexão”.</p>
          </details>
        </div>
        <footer className="flex items-center justify-between border-t border-gray-200 p-5 sm:p-6">
          <Button variant="secondary" disabled={step === 0} onClick={() => setStep((value) => value - 1)}><ArrowLeft className="size-4" /> Voltar</Button>
          {step < card.help.length - 1 ? (
            <Button onClick={() => setStep((value) => value + 1)}>Próximo <ArrowRight className="size-4" /></Button>
          ) : (
            <Button onClick={onClose}><Check className="size-4" /> Entendi</Button>
          )}
        </footer>
      </section>
    </div>
  );
}

function ConfigDialog({ card, appUrl, onClose }: { card: IntegrationCardData; appUrl: string; onClose: () => void }) {
  const action = card.provider === "openai" ? saveOpenAi : card.provider === "calendly" ? saveCalendly : saveWhatsApp;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-950/50 p-4" role="presentation" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="config-title" className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between border-b border-gray-200 p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold text-brand">CONFIGURAÇÃO PROTEGIDA</p>
            <h2 id="config-title" className="mt-1 text-xl font-semibold text-gray-950">{card.name}</h2>
            <p className="mt-2 text-xs leading-5 text-gray-500">O valor secreto será criptografado e nunca será mostrado novamente.</p>
          </div>
          <button onClick={onClose} aria-label="Fechar configuração" className="flex size-10 items-center justify-center rounded-full hover:bg-gray-100"><X className="size-5" /></button>
        </header>
        <form action={action} className="space-y-4 p-5 sm:p-6">
          {card.provider === "openai" && <OpenAiFields card={card} />}
          {card.provider === "calendly" && <SecretField id="calendly-token" name="accessToken" label="Personal Access Token" placeholder="Cole o token completo" />}
          {card.provider === "whatsapp" && <WhatsAppFields appUrl={appUrl} card={card} />}
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-600">
            <ShieldCheck className="size-4 text-emerald-600" /> O navegador não recebe a credencial depois que ela é salva.
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button><ShieldCheck className="size-4" /> Proteger e salvar</Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function OpenAiFields({ card }: { card: IntegrationCardData }) {
  return <>
    <SecretField id="openai-key" name="apiKey" label={card.secretHint ? "Nova chave da API (substituirá a atual)" : "Chave da API"} placeholder="sk-..." />
    <div><Label htmlFor="openai-model">Modelo</Label><Select id="openai-model" name="model" defaultValue={String(card.config.model ?? "gpt-5.4-nano")}><option value="gpt-5.4-nano">GPT-5.4 nano — econômico</option><option value="gpt-5-mini">GPT-5 mini — equilibrado</option><option value="gpt-5">GPT-5 — mais completo</option></Select></div>
    <div><Label htmlFor="monthly-limit">Limite de leads analisados por mês</Label><Input id="monthly-limit" name="monthlyLimit" type="number" min={1} max={100000} defaultValue={Number(card.config.monthly_limit ?? 500)} required /></div>
    <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm text-gray-700"><input name="automaticQualification" type="checkbox" defaultChecked={card.config.automatic_qualification === true} className="size-4 accent-violet-600" /> Qualificar automaticamente novos leads</label>
  </>;
}

function WhatsAppFields({ appUrl, card }: { appUrl: string; card: IntegrationCardData }) {
  const webhook = card.connectionId ? `${appUrl}/api/webhooks/whatsapp/${card.connectionId}` : "A URL aparecerá depois do primeiro salvamento";
  return <>
    <SecretField id="wa-token" name="accessToken" label="Access Token" placeholder="Cole o token permanente" />
    <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="phoneNumberId">Phone Number ID</Label><Input id="phoneNumberId" name="phoneNumberId" inputMode="numeric" required /></div><div><Label htmlFor="businessAccountId">Business Account ID</Label><Input id="businessAccountId" name="businessAccountId" inputMode="numeric" /></div></div>
    <SecretField id="appSecret" name="appSecret" label="App Secret" placeholder="Cole o segredo do aplicativo" />
    <SecretField id="verifyToken" name="verifyToken" label="Verify Token" placeholder="Crie uma frase longa e difícil" />
    <CopyLine label="Callback URL para a Meta" value={webhook} />
  </>;
}

function SecretField({ id, name, label, placeholder }: { id: string; name: string; label: string; placeholder: string }) {
  return <div><Label htmlFor={id}>{label}</Label><Input id={id} name={name} type="password" autoComplete="new-password" placeholder={placeholder} required /></div>;
}

function CopyLine({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3"><p className="text-[10px] font-medium text-gray-500">{label}</p><div className="mt-1 flex items-center gap-2"><code className="min-w-0 flex-1 truncate text-[11px] text-gray-700">{value}</code><button type="button" onClick={async () => { await navigator.clipboard.writeText(value); setCopied(true); }} className="flex h-8 items-center gap-1 rounded-md border border-gray-200 bg-white px-2 text-[10px] font-medium text-gray-600 hover:bg-gray-100">{copied ? <Check className="size-3" /> : <Copy className="size-3" />} {copied ? "Copiado" : "Copiar"}</button></div></div>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
