import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getTaskData(organizationId: string) {
  const supabase = await createClient();
  const [tasksResult, leadsResult, membersResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("organization_id", organizationId)
      .order("status")
      .order("due_at", { nullsFirst: false })
      .limit(500),
    supabase
      .from("leads")
      .select("id, name")
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
    tasksResult.error ?? leadsResult.error ?? membersResult.error;
  if (firstError) throw firstError;
  const tasks = tasksResult.data ?? [];
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
    tasks: tasks.map((task) => ({
      ...task,
      is_overdue:
        task.due_at !== null &&
        new Date(task.due_at).getTime() < new Date().getTime() &&
        !["completed", "cancelled"].includes(task.status),
      lead: task.lead_id ? (leadMap.get(task.lead_id) ?? null) : null,
      assignee: task.assignee_id
        ? (profileMap.get(task.assignee_id) ?? null)
        : null,
    })),
    leads,
    members: members.map((member) => ({
      ...member,
      profile: profileMap.get(member.user_id) ?? null,
    })),
  };
}
