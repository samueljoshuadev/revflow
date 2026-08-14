import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { BoardLead, PipelineBoard } from "@/types/crm";

export async function getDefaultPipelineBoard(
  organizationId: string,
): Promise<PipelineBoard | null> {
  const supabase = await createClient();
  const { data: pipeline, error: pipelineError } = await supabase
    .from("pipelines")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_default", true)
    .maybeSingle();

  if (pipelineError) throw pipelineError;
  if (!pipeline) return null;

  const { data: stages, error: stagesError } = await supabase
    .from("pipeline_stages")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("pipeline_id", pipeline.id)
    .order("position");

  if (stagesError) throw stagesError;

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("pipeline_id", pipeline.id)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (leadsError) throw leadsError;

  const serviceIds = [
    ...new Set(
      leads.flatMap((lead) => (lead.service_id ? [lead.service_id] : [])),
    ),
  ];
  const ownerIds = [
    ...new Set(leads.flatMap((lead) => (lead.owner_id ? [lead.owner_id] : []))),
  ];

  const [servicesResult, profilesResult] = await Promise.all([
    serviceIds.length
      ? supabase.from("services").select("id, name").in("id", serviceIds)
      : Promise.resolve({ data: [], error: null }),
    ownerIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", ownerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (servicesResult.error) throw servicesResult.error;
  if (profilesResult.error) throw profilesResult.error;

  const serviceMap = new Map(
    servicesResult.data.map((service) => [service.id, service.name]),
  );
  const profileMap = new Map(
    profilesResult.data.map((profile) => [profile.id, profile.full_name]),
  );

  const boardLeads: BoardLead[] = leads.map((lead) => ({
    ...lead,
    service_name: lead.service_id
      ? (serviceMap.get(lead.service_id) ?? null)
      : null,
    owner_name: lead.owner_id ? (profileMap.get(lead.owner_id) ?? null) : null,
  }));

  return {
    pipeline,
    stages: stages.map((stage) => ({
      ...stage,
      leads: boardLeads.filter((lead) => lead.stage_id === stage.id),
    })),
  };
}
