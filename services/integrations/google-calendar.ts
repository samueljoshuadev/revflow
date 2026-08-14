import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getGoogleAccessToken } from "@/services/integrations/google";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function syncMeetingToGoogle(
  organizationId: string,
  meetingId: string,
  options: { notifyLeadByEmail?: boolean } = {},
) {
  const admin = createAdminClient();
  if (!admin) return { synced: false, reason: "service_role_missing" } as const;
  const [connectionResult, meetingResult] = await Promise.all([
    admin
      .from("integration_connections")
      .select("id, status, config")
      .eq("organization_id", organizationId)
      .eq("provider", "google_calendar")
      .maybeSingle(),
    admin
      .from("meetings")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", meetingId)
      .maybeSingle(),
  ]);
  if (connectionResult.error || meetingResult.error || !meetingResult.data) {
    return { synced: false, reason: "meeting_lookup_failed" } as const;
  }
  const connection = connectionResult.data;
  if (!connection || connection.status !== "connected") {
    return { synced: false, reason: "google_not_connected" } as const;
  }
  const config = record(connection.config);
  const calendarId =
    typeof config.calendar_id === "string" ? config.calendar_id : "primary";
  const meeting = meetingResult.data;
  const { data: lead } = await admin
    .from("leads")
    .select("name, email, company")
    .eq("organization_id", organizationId)
    .eq("id", meeting.lead_id)
    .maybeSingle();
  const attendeeEmail =
    options.notifyLeadByEmail && lead?.email ? lead.email : null;

  try {
    const accessToken = await getGoogleAccessToken(organizationId, admin);
    const payload = {
      summary: meeting.title,
      description: meeting.description ?? undefined,
      location: meeting.location ?? undefined,
      start: { dateTime: meeting.starts_at, timeZone: meeting.timezone },
      end: { dateTime: meeting.ends_at, timeZone: meeting.timezone },
      conferenceData: {
        createRequest: {
          requestId: `orbit-${meeting.id}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      extendedProperties: {
        private: { orbitMeetingId: meeting.id, orbitOrganizationId: organizationId },
      },
      ...(attendeeEmail
        ? {
            attendees: [
              {
                email: attendeeEmail,
                displayName: lead?.name ?? undefined,
              },
            ],
          }
        : {}),
    };
    const existingId =
      meeting.external_provider === "google_calendar" ? meeting.external_id : null;
    const sendUpdates = attendeeEmail ? "&sendUpdates=all" : "";
    const endpoint = existingId
      ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existingId)}?conferenceDataVersion=1${sendUpdates}`
      : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1${sendUpdates}`;
    const response = await fetch(endpoint, {
      method: existingId ? "PATCH" : "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`google_event_http_${response.status}`);
    const event = (await response.json()) as {
      id: string;
      hangoutLink?: string;
      htmlLink?: string;
    };
    await Promise.all([
      admin
        .from("meetings")
        .update({
          external_provider: "google_calendar",
          external_id: event.id,
          location: event.hangoutLink ?? meeting.location,
          metadata: {
            ...record(meeting.metadata),
            attendee_email: attendeeEmail,
            attendee_notification_requested:
              options.notifyLeadByEmail === true,
            google_event_url: event.htmlLink ?? null,
          },
        })
        .eq("organization_id", organizationId)
        .eq("id", meetingId),
      admin
        .from("integration_connections")
        .update({
          last_synced_at: new Date().toISOString(),
          last_error_code: null,
        })
        .eq("organization_id", organizationId)
        .eq("provider", "google_calendar"),
    ]);
    return {
      synced: true,
      notified: Boolean(attendeeEmail),
      missingAttendeeEmail:
        options.notifyLeadByEmail === true && !attendeeEmail,
    } as const;
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 100) : "google_sync_failed";
    await admin
      .from("integration_connections")
      .update({ status: "attention", last_error_code: code })
      .eq("organization_id", organizationId)
      .eq("provider", "google_calendar");
    console.error("google_meeting_sync_failed", { code });
    return { synced: false, reason: code } as const;
  }
}

export async function cancelGoogleMeeting(
  organizationId: string,
  meetingId: string,
) {
  const admin = createAdminClient();
  if (!admin) return false;
  const { data: meeting } = await admin
    .from("meetings")
    .select("external_provider, external_id")
    .eq("organization_id", organizationId)
    .eq("id", meetingId)
    .maybeSingle();
  if (meeting?.external_provider !== "google_calendar" || !meeting.external_id) return false;
  const { data: connection } = await admin
    .from("integration_connections")
    .select("config")
    .eq("organization_id", organizationId)
    .eq("provider", "google_calendar")
    .maybeSingle();
  const config = record(connection?.config);
  const calendarId = typeof config.calendar_id === "string" ? config.calendar_id : "primary";
  try {
    const accessToken = await getGoogleAccessToken(organizationId, admin);
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(meeting.external_id)}?sendUpdates=all`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      },
    );
    return response.ok || response.status === 404 || response.status === 410;
  } catch {
    return false;
  }
}
