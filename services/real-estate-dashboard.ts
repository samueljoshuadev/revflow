import "server-only";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const realEstateMetricsSchema = z.object({
  leads_received: z.number(),
  new_leads_30d: z.number(),
  scheduled_visits: z.number(),
  completed_visits: z.number(),
  proposals: z.number(),
  available_properties: z.number(),
  average_first_response_minutes: z.number().nullable(),
  broker_conversion: z.array(
    z.object({
      user_id: z.string(),
      name: z.string(),
      leads: z.number(),
      won: z.number(),
      conversion_rate: z.number(),
    }),
  ),
  loss_reasons: z.array(z.object({ reason: z.string(), count: z.number() })),
  top_properties: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      title: z.string(),
      recommendations: z.number(),
    }),
  ),
});

export type RealEstateDashboardMetrics = z.infer<
  typeof realEstateMetricsSchema
>;

export async function getRealEstateDashboardMetrics(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_real_estate_dashboard_metrics",
    { p_organization_id: organizationId },
  );
  if (error) throw error;
  return realEstateMetricsSchema.parse(data);
}

