"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { parseLocalDateTimeWithOffset } from "@/lib/datetime";

const bookingSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(120),
  name: z.string().trim().min(2).max(160),
  email: z.email().max(254),
  phone: z.string().trim().max(40),
  company: z.string().trim().max(160),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  utcOffset: z.string().regex(/^[+-](0\d|1[0-4]):[0-5]\d$/),
  idempotencyKey: z.string().min(16).max(200),
  website: z.string().max(200),
});

export async function bookMeeting(formData: FormData) {
  const parsed = bookingSchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    company: formData.get("company") ?? "",
    startsAt: formData.get("startsAt"),
    utcOffset: formData.get("utcOffset"),
    idempotencyKey: formData.get("idempotencyKey"),
    website: formData.get("website") ?? "",
  });
  const base = `/book/${encodeURIComponent(String(formData.get("slug") ?? ""))}`;
  if (!parsed.success) redirect(`${base}?error=Revise+os+dados+informados.`);
  let startsAt: Date;
  try {
    startsAt = parseLocalDateTimeWithOffset(
      parsed.data.startsAt,
      parsed.data.utcOffset,
    );
  } catch {
    redirect(`${base}?error=Data+inválida.`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("book_public_meeting", {
    p_slug: parsed.data.slug,
    p_name: parsed.data.name,
    p_email: parsed.data.email,
    p_phone: parsed.data.phone,
    p_company: parsed.data.company,
    p_starts_at: startsAt.toISOString(),
    p_idempotency_key: parsed.data.idempotencyKey,
    p_website: parsed.data.website,
  });
  if (error) {
    console.error("public_booking_failed", { code: error.code });
    const message =
      error.message.includes("available") || error.message.includes("conflict")
        ? "O+horário+acabou+de+ser+ocupado.+Escolha+outro."
        : error.message.includes("business")
          ? "Escolha+um+horário+dentro+do+atendimento."
          : "Não+foi+possível+agendar.+Tente+novamente.";
    redirect(`${base}?error=${message}`);
  }
  redirect(`${base}?success=1`);
}
