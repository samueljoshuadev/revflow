import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getPostSaleData(organizationId: string) {
  const supabase = await createClient();
  const [clientsResult, proposalsResult, projectsResult] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase
      .from("proposals")
      .select("*")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase
      .from("projects")
      .select("*")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false })
      .limit(200),
  ]);
  const firstError =
    clientsResult.error ?? proposalsResult.error ?? projectsResult.error;
  if (firstError) throw firstError;
  return {
    clients: clientsResult.data ?? [],
    proposals: proposalsResult.data ?? [],
    projects: projectsResult.data ?? [],
  };
}
