"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export type CaptureFormState = {
  ok: boolean;
  duplicate?: boolean;
  error?: string;
};

const schema = z
  .object({
    organizationSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    sourceKey: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    idempotencyKey: z.uuid(),
    name: z.string().trim().min(2).max(160),
    email: z.preprocess(
      (value) => (value === "" ? null : value),
      z.email().max(254).nullable(),
    ),
    phone: z.preprocess(
      (value) => (value === "" ? null : value),
      z.string().trim().max(40).nullable(),
    ),
    company: z.preprocess(
      (value) => (value === "" ? null : value),
      z.string().trim().max(160).nullable(),
    ),
    summary: z.preprocess(
      (value) => (value === "" ? null : value),
      z.string().trim().max(2000).nullable(),
    ),
    website: z.string().max(200).optional().default(""),
  })
  .refine((value) => value.email || value.phone, {
    message: "Informe e-mail ou telefone.",
  });

export async function submitCaptureForm(
  _previous: CaptureFormState,
  formData: FormData,
): Promise<CaptureFormState> {
  const parsed = schema.safeParse({
    organizationSlug: formData.get("organizationSlug"),
    sourceKey: formData.get("sourceKey"),
    idempotencyKey: formData.get("idempotencyKey"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    company: formData.get("company"),
    summary: formData.get("summary"),
    website: formData.get("website"),
  });
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Revise os dados.",
    };
  const requestHeaders = await headers();
  const identifier =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    parsed.data.email ||
    parsed.data.phone ||
    "public-form";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("capture_external_lead", {
    p_organization_slug: parsed.data.organizationSlug,
    p_source_key: parsed.data.sourceKey,
    p_channel: "form",
    p_token: null,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_identifier: identifier,
    p_name: parsed.data.name,
    p_email: parsed.data.email ?? "",
    p_phone: parsed.data.phone ?? "",
    p_company: parsed.data.company,
    p_summary: parsed.data.summary,
    p_website: parsed.data.website,
  });
  if (error) {
    const message = error.message.includes("rate_limited")
      ? "Muitas tentativas. Aguarde antes de enviar novamente."
      : "Não foi possível enviar agora. Tente novamente.";
    return { ok: false, error: message };
  }
  const result =
    data && typeof data === "object" && !Array.isArray(data) ? data : {};
  return { ok: result.accepted === true, duplicate: result.duplicate === true };
}
