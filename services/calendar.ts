import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getCalendarData(organizationId: string) {
  const supabase = await createClient();
  const [meetingsResult, leadsResult, membersResult] = await Promise.all([
    supabase
      .from("meetings")
      .select("*")
      .eq("organization_id", organizationId)
      .gte("starts_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
      .lte("starts_at", new Date(Date.now() + 180 * 86_400_000).toISOString())
      .order("starts_at")
      .limit(500),
    supabase
      .from("leads")
      .select("id, name, company, email, owner_id, next_action")
      .eq("organization_id", organizationId)
      .is("archived_at", null)
      .order("name")
      .limit(500),
    supabase
      .from("organization_members")
      .select("user_id, role")
      .eq("organization_id", organizationId),
  ]);
  const firstError =
    meetingsResult.error ?? leadsResult.error ?? membersResult.error;
  if (firstError) throw firstError;

  const meetings = meetingsResult.data ?? [];
  const leads = leadsResult.data ?? [];
  const members = membersResult.data ?? [];
  const profileIds = members.map((member) => member.user_id);
  const { data: profiles, error: profilesError } = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", profileIds)
    : { data: [], error: null };
  if (profilesError) throw profilesError;
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const leadMap = new Map(leads.map((lead) => [lead.id, lead]));

  return {
    referenceTime: new Date().toISOString(),
    meetings: meetings.map((meeting) => ({
      ...meeting,
      lead: leadMap.get(meeting.lead_id) ?? null,
      owner: meeting.owner_id
        ? (profileMap.get(meeting.owner_id) ?? null)
        : null,
    })),
    leads,
    members: members.map((member) => ({
      ...member,
      profile: profileMap.get(member.user_id) ?? null,
    })),
  };
}
