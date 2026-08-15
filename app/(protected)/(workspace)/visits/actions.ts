"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { parseLocalDateTimeWithOffset } from "@/lib/datetime";
import { syncMeetingToGoogle } from "@/services/integrations/google-calendar";
import { requireRealEstateWorkspace } from "@/services/workspace";

const rescheduleSchema = z.object({
  meetingId: z.uuid(),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  utcOffset: z.string().regex(/^[+-](0\d|1[0-4]):[0-5]\d$/),
  duration: z.coerce.number().int().min(15).max(240),
});

export async function rescheduleVisit(formData: FormData) {
  const { organization } = await requireRealEstateWorkspace();
  const parsed = rescheduleSchema.safeParse({
    meetingId: formData.get("meetingId"),
    startsAt: formData.get("startsAt"),
    utcOffset: formData.get("utcOffset"),
    duration: formData.get("duration"),
  });
  if (!parsed.success) redirect("/visits?error=Revise+a+nova+data+da+visita.");
  let startsAt: Date;
  try {
    startsAt = parseLocalDateTimeWithOffset(
      parsed.data.startsAt,
      parsed.data.utcOffset,
    );
  } catch {
    redirect("/visits?error=Data+ou+fuso+horário+inválido.");
  }
  const endsAt = new Date(startsAt.getTime() + parsed.data.duration * 60_000);
  const supabase = await createClient();
  const { error } = await supabase.rpc("reschedule_property_visit", {
    p_organization_id: organization.id,
    p_meeting_id: parsed.data.meetingId,
    p_starts_at: startsAt.toISOString(),
    p_ends_at: endsAt.toISOString(),
  });
  if (error) {
    console.error("visit_reschedule_failed", { code: error.code });
    const message = error.message.includes("conflict")
      ? "Este+horário+conflita+com+outro+compromisso."
      : "Não+foi+possível+reagendar+a+visita.";
    redirect(`/visits?error=${message}`);
  }
  await syncMeetingToGoogle(organization.id, parsed.data.meetingId);
  revalidatePath("/visits");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  redirect("/visits?message=Visita+reagendada.");
}

