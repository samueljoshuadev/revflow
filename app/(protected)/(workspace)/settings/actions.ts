"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  ACTIVE_ORGANIZATION_COOKIE,
  listUserOrganizations,
} from "@/services/organizations";
import { requireWorkspace } from "@/services/workspace";

const nullableText = (max: number) =>
  z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().max(max).nullable(),
  );

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  document: nullableText(40),
  contactEmail: z.preprocess(
    (value) => (value === "" ? null : value),
    z.email().max(254).nullable(),
  ),
  phone: nullableText(40),
  website: z.preprocess(
    (value) => (value === "" ? null : value),
    z.url().max(300).nullable(),
  ),
  timezone: z.string().trim().min(3).max(80),
  currency: z.string().trim().toUpperCase().length(3),
  workdayStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  workdayEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  bookingDuration: z.coerce.number().int().min(15).max(240),
  bookingBuffer: z.coerce.number().int().min(0).max(120),
  meetingLocation: nullableText(300),
  bookingEnabled: z.boolean(),
  lossReasons: z.array(z.string().trim().min(2).max(100)).max(20),
});

export async function updateOrganizationSettings(formData: FormData) {
  const { organization } = await requireWorkspace();
  if (!["owner", "admin"].includes(organization.role)) {
    redirect(
      "/settings?error=Somente+administradores+podem+alterar+as+configurações.",
    );
  }
  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    document: formData.get("document"),
    contactEmail: formData.get("contactEmail"),
    phone: formData.get("phone"),
    website: formData.get("website"),
    timezone: formData.get("timezone"),
    currency: formData.get("currency"),
    workdayStart: formData.get("workdayStart"),
    workdayEnd: formData.get("workdayEnd"),
    bookingDuration: formData.get("bookingDuration"),
    bookingBuffer: formData.get("bookingBuffer"),
    meetingLocation: formData.get("meetingLocation"),
    bookingEnabled: formData.get("bookingEnabled") === "on",
    lossReasons: String(formData.get("lossReasons") ?? "")
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean),
  });
  if (!parsed.success || parsed.data.workdayEnd <= parsed.data.workdayStart) {
    redirect("/settings?error=Revise+os+campos+e+o+horário+de+atendimento.");
  }

  const businessHours = Object.fromEntries(
    [1, 2, 3, 4, 5].map((day) => [
      day,
      [parsed.data.workdayStart, parsed.data.workdayEnd],
    ]),
  );
  const supabase = await createClient();
  const currentSettings =
    organization.settings &&
    typeof organization.settings === "object" &&
    !Array.isArray(organization.settings)
      ? organization.settings
      : {};
  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      document: parsed.data.document,
      contact_email: parsed.data.contactEmail,
      phone: parsed.data.phone,
      website: parsed.data.website,
      timezone: parsed.data.timezone,
      currency: parsed.data.currency,
      business_hours: businessHours,
      booking_duration_minutes: parsed.data.bookingDuration,
      booking_buffer_minutes: parsed.data.bookingBuffer,
      meeting_location: parsed.data.meetingLocation,
      booking_enabled: parsed.data.bookingEnabled,
      settings: {
        ...currentSettings,
        loss_reasons: [...new Set(parsed.data.lossReasons)],
      },
    })
    .eq("id", organization.id);
  if (error) {
    console.error("organization_settings_update_failed", { code: error.code });
    redirect("/settings?error=Não+foi+possível+salvar+as+configurações.");
  }
  revalidatePath("/", "layout");
  redirect("/settings?message=Configurações+salvas.");
}

const serviceSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: nullableText(1000),
  basePrice: z.preprocess(
    (value) => (value === "" ? null : value),
    z.coerce.number().min(0).max(999_999_999).nullable(),
  ),
  meetingDuration: z.preprocess(
    (value) => (value === "" ? null : value),
    z.coerce.number().int().min(15).max(240).nullable(),
  ),
});

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function createService(formData: FormData) {
  const { organization } = await requireWorkspace();
  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    basePrice: formData.get("basePrice"),
    meetingDuration: formData.get("meetingDuration"),
  });
  if (!parsed.success) redirect("/settings?error=Revise+o+novo+serviço.");

  const supabase = await createClient();
  const { error } = await supabase.from("services").insert({
    organization_id: organization.id,
    name: parsed.data.name,
    slug: `${slugify(parsed.data.name)}-${crypto.randomUUID().slice(0, 6)}`,
    description: parsed.data.description,
    base_price: parsed.data.basePrice,
    meeting_duration_minutes: parsed.data.meetingDuration,
  });
  if (error) redirect("/settings?error=Não+foi+possível+criar+o+serviço.");
  revalidatePath("/settings");
  redirect("/settings?message=Serviço+criado.");
}

export async function switchOrganization(formData: FormData) {
  const parsed = z.uuid().safeParse(formData.get("organizationId"));
  if (!parsed.success) return;
  const { user } = await requireWorkspace();
  const organizations = await listUserOrganizations(user.id);
  if (!organizations.some((item) => item.id === parsed.data)) return;

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORGANIZATION_COOKIE, parsed.data, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
  redirect("/dashboard");
}
