import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { LeadDetail } from "@/types/crm";
import type { Tables } from "@/types/database";

export async function listLeads(
  organizationId: string,
  options: {
    query?: string;
    page?: number;
    priority?: Tables<"leads">["priority"];
    archived?: boolean;
  } = {},
) {
  const supabase = await createClient();
  const page = Math.max(options.page ?? 1, 1);
  const pageSize = 50;
  const from = (page - 1) * pageSize;
  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .range(from, from + pageSize - 1);

  const search = options.query?.trim();
  if (search) {
    const escaped = search.replace(/[\\%_]/g, (value) => `\\${value}`);
    query = query.ilike("name", `%${escaped}%`);
  }
  query = options.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);
  if (options.priority) query = query.eq("priority", options.priority);

  const { data: leads, count, error } = await query;
  if (error) throw error;

  const stageIds = [...new Set(leads.map((lead) => lead.stage_id))];
  const serviceIds = [
    ...new Set(
      leads.flatMap((lead) => (lead.service_id ? [lead.service_id] : [])),
    ),
  ];
  const [stagesResult, servicesResult] = await Promise.all([
    stageIds.length
      ? supabase
          .from("pipeline_stages")
          .select("id, name, color")
          .in("id", stageIds)
      : Promise.resolve({ data: [], error: null }),
    serviceIds.length
      ? supabase.from("services").select("id, name").in("id", serviceIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (stagesResult.error) throw stagesResult.error;
  if (servicesResult.error) throw servicesResult.error;
  const stageMap = new Map(stagesResult.data.map((stage) => [stage.id, stage]));
  const serviceMap = new Map(
    servicesResult.data.map((service) => [service.id, service]),
  );

  return {
    leads: leads.map((lead) => ({
      ...lead,
      stage: stageMap.get(lead.stage_id) ?? null,
      service: lead.service_id
        ? (serviceMap.get(lead.service_id) ?? null)
        : null,
    })),
    count: count ?? 0,
    page,
    pageSize,
  };
}

export async function getLeadDetail(
  organizationId: string,
  leadId: string,
): Promise<LeadDetail | null> {
  const supabase = await createClient();
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", leadId)
    .maybeSingle();

  if (leadError) throw leadError;
  if (!lead) return null;

  const [
    stageResult,
    pipelineResult,
    serviceResult,
    ownerResult,
    eventsResult,
    notesResult,
    leadTagsResult,
  ] = await Promise.all([
    supabase
      .from("pipeline_stages")
      .select("*")
      .eq("id", lead.stage_id)
      .single(),
    supabase.from("pipelines").select("*").eq("id", lead.pipeline_id).single(),
    lead.service_id
      ? supabase
          .from("services")
          .select("*")
          .eq("id", lead.service_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    lead.owner_id
      ? supabase
          .from("profiles")
          .select("*")
          .eq("id", lead.owner_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("lead_events")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("lead_notes")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("lead_tags")
      .select("tag_id")
      .eq("organization_id", organizationId)
      .eq("lead_id", leadId),
  ]);

  const requiredError =
    stageResult.error ??
    pipelineResult.error ??
    serviceResult.error ??
    ownerResult.error ??
    eventsResult.error ??
    notesResult.error ??
    leadTagsResult.error;
  if (requiredError) throw requiredError;
  if (
    !stageResult.data ||
    !pipelineResult.data ||
    !eventsResult.data ||
    !notesResult.data ||
    !leadTagsResult.data
  ) {
    throw new Error("Dados relacionados do lead não foram encontrados.");
  }

  const noteAuthorIds = [
    ...new Set(notesResult.data.map((note) => note.author_id)),
  ];
  const tagIds = leadTagsResult.data.map((item) => item.tag_id);
  const [authorsResult, tagsResult] = await Promise.all([
    noteAuthorIds.length
      ? supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", noteAuthorIds)
      : Promise.resolve({ data: [], error: null }),
    tagIds.length
      ? supabase.from("tags").select("*").in("id", tagIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (authorsResult.error) throw authorsResult.error;
  if (tagsResult.error) throw tagsResult.error;
  const authorMap = new Map(
    authorsResult.data.map((profile) => [profile.id, profile.full_name]),
  );

  return {
    ...lead,
    stage: stageResult.data,
    pipeline: pipelineResult.data,
    service: serviceResult.data,
    owner: ownerResult.data,
    events: eventsResult.data,
    notes: notesResult.data.map((note) => ({
      ...note,
      author_name: authorMap.get(note.author_id) ?? null,
    })),
    tags: tagsResult.data,
  };
}

export async function getLeadFormOptions(organizationId: string) {
  const supabase = await createClient();
  const { data: pipeline, error: pipelineError } = await supabase
    .from("pipelines")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_default", true)
    .single();
  if (pipelineError) throw pipelineError;

  const [stagesResult, servicesResult, membersResult, tagsResult] =
    await Promise.all([
      supabase
        .from("pipeline_stages")
        .select("*")
        .eq("pipeline_id", pipeline.id)
        .order("position"),
      supabase
        .from("services")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("organization_members")
        .select("user_id, role")
        .eq("organization_id", organizationId),
      supabase
        .from("tags")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name"),
    ]);

  if (stagesResult.error) throw stagesResult.error;
  if (servicesResult.error) throw servicesResult.error;
  if (membersResult.error) throw membersResult.error;
  if (tagsResult.error) throw tagsResult.error;
  const members = membersResult.data ?? [];
  const tags = tagsResult.data ?? [];
  const profileIds = members.map((member) => member.user_id);
  const { data: profiles, error: profilesError } = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", profileIds)
    : { data: [], error: null };
  if (profilesError) throw profilesError;
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  return {
    pipeline,
    stages: stagesResult.data,
    services: servicesResult.data,
    members: members.map((member) => ({
      ...member,
      profile: profileMap.get(member.user_id) ?? null,
    })),
    tags,
  };
}
