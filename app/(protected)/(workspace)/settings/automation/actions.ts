"use server";

import { createHash, randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/services/workspace";

export type CaptureSourceState = {
  ok: boolean;
  token?: string;
  error?: string;
};

const nullableUuid = z.preprocess(
  (value) => (value === "" ? null : value),
  z.uuid().nullable(),
);

const captureSourceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  sourceKey: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  channel: z.enum(["form", "webhook"]),
  sourceLabel: z.string().trim().min(1).max(100),
  campaign: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().max(160).nullable(),
  ),
  serviceId: nullableUuid,
  ownerId: nullableUuid,
});

export async function createCaptureSource(
  _previous: CaptureSourceState,
  formData: FormData,
): Promise<CaptureSourceState> {
  const { user, organization } = await requireWorkspace();
  if (!["owner", "admin"].includes(organization.role)) {
    return {
      ok: false,
      error: "Somente administradores podem criar entradas.",
    };
  }
  const parsed = captureSourceSchema.safeParse({
    name: formData.get("name"),
    sourceKey: formData.get("sourceKey"),
    channel: formData.get("channel"),
    sourceLabel: formData.get("sourceLabel"),
    campaign: formData.get("campaign"),
    serviceId: formData.get("serviceId"),
    ownerId: formData.get("ownerId"),
  });
  if (!parsed.success)
    return { ok: false, error: "Revise os dados da entrada." };

  const token =
    parsed.data.channel === "webhook"
      ? randomBytes(32).toString("base64url")
      : null;
  const supabase = await createClient();
  const { error } = await supabase.from("lead_capture_sources").insert({
    organization_id: organization.id,
    name: parsed.data.name,
    source_key: parsed.data.sourceKey,
    channel: parsed.data.channel,
    source_label: parsed.data.sourceLabel,
    campaign: parsed.data.campaign,
    default_service_id: parsed.data.serviceId,
    default_owner_id: parsed.data.ownerId,
    token_hash: token
      ? `\\x${createHash("sha256").update(token).digest("hex")}`
      : null,
    token_hint: token ? token.slice(-4) : null,
    created_by: user.id,
  });
  if (error) {
    console.error("capture_source_creation_failed", { code: error.code });
    return {
      ok: false,
      error:
        error.code === "23505"
          ? "Essa identificação já está em uso."
          : "Não foi possível criar a entrada.",
    };
  }
  revalidatePath("/settings/automation");
  return { ok: true, token: token ?? undefined };
}

export async function toggleCaptureSource(formData: FormData) {
  const { organization } = await requireWorkspace();
  if (!["owner", "admin"].includes(organization.role)) return;
  const parsed = z
    .object({ id: z.uuid(), active: z.enum(["true", "false"]) })
    .safeParse({
      id: formData.get("id"),
      active: formData.get("active"),
    });
  if (!parsed.success) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("lead_capture_sources")
    .update({ is_active: parsed.data.active === "true" })
    .eq("organization_id", organization.id)
    .eq("id", parsed.data.id);
  if (error)
    console.error("capture_source_toggle_failed", { code: error.code });
  revalidatePath("/settings/automation");
}

const followUpSchema = z.object({
  name: z.string().trim().min(2).max(100),
  triggerKind: z.enum([
    "first_contact",
    "return",
    "proposal",
    "reactivation",
    "stale",
  ]),
  delayDays: z.coerce.number().int().min(0).max(365),
  notifyEmail: z.boolean(),
});

export async function createFollowUpRule(formData: FormData) {
  const { user, organization } = await requireWorkspace();
  if (!["owner", "admin"].includes(organization.role)) return;
  const parsed = followUpSchema.safeParse({
    name: formData.get("name"),
    triggerKind: formData.get("triggerKind"),
    delayDays: formData.get("delayDays"),
    notifyEmail: formData.get("notifyEmail") === "on",
  });
  if (!parsed.success) return;
  const supabase = await createClient();
  const { error } = await supabase.from("follow_up_rules").insert({
    organization_id: organization.id,
    name: parsed.data.name,
    trigger_kind: parsed.data.triggerKind,
    delay_days: parsed.data.delayDays,
    notify_in_app: true,
    notify_email: parsed.data.notifyEmail,
    created_by: user.id,
  });
  if (error)
    console.error("follow_up_rule_creation_failed", { code: error.code });
  revalidatePath("/settings/automation");
}

export async function toggleRule(formData: FormData) {
  const { organization } = await requireWorkspace();
  if (!["owner", "admin"].includes(organization.role)) return;
  const parsed = z
    .object({
      table: z.enum(["follow_up_rules", "kanban_automation_rules"]),
      id: z.uuid(),
      active: z.enum(["true", "false"]),
    })
    .safeParse({
      table: formData.get("table"),
      id: formData.get("id"),
      active: formData.get("active"),
    });
  if (!parsed.success) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from(parsed.data.table)
    .update({ is_active: parsed.data.active === "true" })
    .eq("organization_id", organization.id)
    .eq("id", parsed.data.id);
  if (error)
    console.error("automation_rule_toggle_failed", { code: error.code });
  revalidatePath("/settings/automation");
}
