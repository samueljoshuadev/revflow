"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { parseLocalDateTimeWithOffset } from "@/lib/datetime";
import {
  cancelGoogleMeeting,
  syncMeetingToGoogle,
} from "@/services/integrations/google-calendar";
import { requireWorkspace } from "@/services/workspace";

const meetingSchema = z.object({
  leadId: z.uuid(),
  ownerId: z.uuid(),
  title: z.string().trim().min(2).max(180),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  utcOffset: z.string().regex(/^[+-](0\d|1[0-4]):[0-5]\d$/),
  duration: z.coerce.number().int().min(15).max(240),
  description: z.string().trim().max(2000),
  location: z.string().trim().max(300),
  notifyLeadByEmail: z.boolean(),
});

export async function createMeeting(formData: FormData) {
  const { organization } = await requireWorkspace();
  const parsed = meetingSchema.safeParse({
    leadId: formData.get("leadId"),
    ownerId: formData.get("ownerId"),
    title: formData.get("title"),
    startsAt: formData.get("startsAt"),
    utcOffset: formData.get("utcOffset"),
    duration: formData.get("duration"),
    description: formData.get("description") ?? "",
    location: formData.get("location") ?? "",
    notifyLeadByEmail: formData.get("notifyLeadByEmail") === "on",
  });
  if (!parsed.success) redirect("/calendar?error=Revise+os+dados+da+reuniÃ£o.");
  let startsAt: Date;
  try {
    startsAt = parseLocalDateTimeWithOffset(
      parsed.data.startsAt,
      parsed.data.utcOffset,
    );
  } catch {
    redirect("/calendar?error=Data+ou+fuso+horÃ¡rio+invÃ¡lido.");
  }
  const endsAt = new Date(startsAt.getTime() + parsed.data.duration * 60_000);

  const supabase = await createClient();
  const { data: meetingId, error } = await supabase.rpc("schedule_meeting", {
    p_organization_id: organization.id,
    p_lead_id: parsed.data.leadId,
    p_owner_id: parsed.data.ownerId,
    p_title: parsed.data.title,
    p_starts_at: startsAt.toISOString(),
    p_ends_at: endsAt.toISOString(),
    p_timezone: organization.timezone,
    p_description: parsed.data.description || null,
    p_location: parsed.data.location || organization.meeting_location,
  });
  if (error) {
    console.error("meeting_creation_failed", { code: error.code });
    const message = error.message.includes("conflict")
      ? "Esse+horÃ¡rio+jÃ¡+estÃ¡+ocupado."
      : "NÃ£o+foi+possÃ­vel+agendar+a+reuniÃ£o.";
    redirect(`/calendar?error=${message}`);
  }
  let message = "Reunião+agendada.";
  if (typeof meetingId === "string") {
    const sync = await syncMeetingToGoogle(organization.id, meetingId, {
      notifyLeadByEmail: parsed.data.notifyLeadByEmail,
    });
    if (sync.synced && sync.notified) {
      message = "Reunião+agendada+e+convite+enviado+pelo+Google+Calendar.";
    } else if (sync.synced && sync.missingAttendeeEmail) {
      message = "Reunião+agendada.+Lead+sem+e-mail+para+receber+convite.";
    }
  }
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  redirect(`/calendar?message=${message}`);
}

export async function updateMeetingStatus(formData: FormData) {
  const { organization } = await requireWorkspace();
  const parsed = z
    .object({
      meetingId: z.uuid(),
      status: z.enum(["cancelled", "completed", "no_show"]),
      reason: z.string().trim().max(500),
    })
    .safeParse({
      meetingId: formData.get("meetingId"),
      status: formData.get("status"),
      reason: formData.get("reason") ?? "",
    });
  if (!parsed.success) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_meeting_status", {
    p_organization_id: organization.id,
    p_meeting_id: parsed.data.meetingId,
    p_status: parsed.data.status,
    p_reason: parsed.data.reason || null,
  });
  if (error)
    console.error("meeting_status_update_failed", { code: error.code });
  if (!error && parsed.data.status === "cancelled") {
    await cancelGoogleMeeting(organization.id, parsed.data.meetingId);
  }
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}


