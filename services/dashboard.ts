import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const dashboardMetricsSchema = z.object({
  total_leads: z.number(),
  new_leads: z.number(),
  qualified_leads: z.number(),
  scheduled_meetings: z.number(),
  proposals_sent: z.number(),
  won_deals: z.number(),
  conversion_rate: z.number(),
  pipeline_value: z.number(),
  average_ticket: z.number(),
  upcoming_meetings: z.number(),
  open_tasks: z.number(),
  overdue_tasks: z.number(),
  active_clients: z.number(),
  active_projects: z.number(),
  stages: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      color: z.string(),
      count: z.number(),
    }),
  ),
  sources: z.array(z.object({ name: z.string(), count: z.number() })),
  seller_performance: z.array(
    z.object({
      user_id: z.string(),
      name: z.string(),
      leads: z.number(),
      won: z.number(),
      pipeline_value: z.number(),
    }),
  ),
});

export type DashboardMetrics = z.infer<typeof dashboardMetricsSchema>;

export async function getDashboardMetrics(organizationId: string) {
  const supabase = await createClient();
  const [commercial, operational] = await Promise.all([
    supabase.rpc("get_dashboard_metrics", {
      p_organization_id: organizationId,
    }),
    supabase.rpc("get_operational_metrics", {
      p_organization_id: organizationId,
    }),
  ]);

  if (commercial.error) throw commercial.error;
  if (operational.error) throw operational.error;
  return dashboardMetricsSchema.parse({
    ...(commercial.data as Record<string, unknown>),
    ...(operational.data as Record<string, unknown>),
  });
}
