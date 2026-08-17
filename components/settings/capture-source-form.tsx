"use client";

import { CheckCircle2, Copy, LoaderCircle } from "lucide-react";
import { useActionState, useState } from "react";

import {
  createCaptureSource,
  type CaptureSourceState,
} from "@/app/(protected)/(workspace)/settings/automation/actions";

const initialState: CaptureSourceState = { ok: false };

export function CaptureSourceForm({
  services,
  members,
}: {
  services: Array<{ id: string; name: string }>;
  members: Array<{ id: string; name: string }>;
}) {
  const [state, action, pending] = useActionState(
    createCaptureSource,
    initialState,
  );
  const [channel, setChannel] = useState("form");
  const [copied, setCopied] = useState(false);

  if (state.ok) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
          <CheckCircle2 className="size-4" /> Entrada criada
        </div>
        {state.token ? (
          <div className="mt-3">
            <p className="text-xs leading-5 text-emerald-800">
              Copie o token agora. Por segurança ele não será exibido novamente.
            </p>
            <div className="mt-2 flex gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-white px-3 py-2 text-xs text-gray-800">
                {state.token}
              </code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(state.token ?? "");
                  setCopied(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 text-xs font-medium text-emerald-900"
              >
                <Copy className="size-3.5" /> {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-xs text-emerald-800">
            O link público já está disponível na lista abaixo.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field
        label="Nome interno"
        name="name"
        placeholder="Formulário do site"
        required
      />
      <Field
        label="Identificação na URL"
        name="sourceKey"
        placeholder="site-principal"
        pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
        required
      />
      <label className="text-xs font-medium text-gray-700">
        Tipo
        <select
          name="channel"
          value={channel}
          onChange={(event) => setChannel(event.target.value)}
          className="mt-1.5 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
        >
          <option value="form">Formulário público</option>
          <option value="webhook">Webhook autenticado</option>
        </select>
      </label>
      <Field
        label="Origem gravada no lead"
        name="sourceLabel"
        placeholder="Site"
        required
      />
      <Field
        label="Campanha (opcional)"
        name="campaign"
        placeholder="Campanha institucional"
      />
      <Select label="Serviço padrão" name="serviceId" options={services} />
      <Select label="Responsável padrão" name="ownerId" options={members} />
      <div className="flex items-end sm:col-span-2 lg:col-span-3">
        <button
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-gray-950 px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          {channel === "webhook" ? "Criar webhook e token" : "Criar formulário"}
        </button>
      </div>
      {state.error && (
        <p className="text-xs text-red-600 sm:col-span-2 lg:col-span-3">
          {state.error}
        </p>
      )}
    </form>
  );
}

function Field(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string },
) {
  const { label, ...inputProps } = props;
  return (
    <label className="text-xs font-medium text-gray-700">
      {label}
      <input
        {...inputProps}
        className="mt-1.5 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm"
      />
    </label>
  );
}

function Select({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: Array<{ id: string; name: string }>;
}) {
  return (
    <label className="text-xs font-medium text-gray-700">
      {label}
      <select
        name={name}
        className="mt-1.5 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
      >
        <option value="">Não definir</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}
