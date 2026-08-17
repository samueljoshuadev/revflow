"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import {
  submitCaptureForm,
  type CaptureFormState,
} from "@/app/capture/[organizationSlug]/[sourceKey]/actions";

const initialState: CaptureFormState = { ok: false };

export function PublicLeadForm({
  organizationSlug,
  sourceKey,
}: {
  organizationSlug: string;
  sourceKey: string;
}) {
  const [state, action, pending] = useActionState(
    submitCaptureForm,
    initialState,
  );
  const idempotencyInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (idempotencyInput.current)
      idempotencyInput.current.value = crypto.randomUUID();
  }, []);
  if (state.ok)
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto size-7 text-emerald-600" />
        <h2 className="mt-3 text-lg font-semibold text-emerald-950">
          Recebemos seus dados
        </h2>
        <p className="mt-2 text-sm leading-6 text-emerald-800">
          A equipe comercial poderá continuar o atendimento a partir daqui.
        </p>
      </div>
    );
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="organizationSlug" value={organizationSlug} />
      <input type="hidden" name="sourceKey" value={sourceKey} />
      <input ref={idempotencyInput} type="hidden" name="idempotencyKey" />
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label>
          Não preencha
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Field label="Nome" name="name" autoComplete="name" required />
      <Field label="E-mail" name="email" type="email" autoComplete="email" />
      <Field
        label="Telefone ou WhatsApp"
        name="phone"
        type="tel"
        autoComplete="tel"
      />
      <Field label="Empresa" name="company" autoComplete="organization" />
      <label className="block text-sm font-medium text-gray-700">
        Como podemos ajudar?
        <textarea
          name="summary"
          rows={4}
          maxLength={2000}
          className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
        />
      </label>
      {state.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending && <LoaderCircle className="size-4 animate-spin" />}
        {pending ? "Enviando..." : "Falar com a equipe"}
      </button>
      <p className="text-center text-[11px] leading-5 text-gray-400">
        Ao enviar, você autoriza o contato sobre esta solicitação.
      </p>
    </form>
  );
}
function Field(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string },
) {
  const { label, ...input } = props;
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <input
        {...input}
        className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
      />
    </label>
  );
}
