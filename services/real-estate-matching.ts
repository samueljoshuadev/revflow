import "server-only";

import { createClient } from "@/lib/supabase/server";
import { scorePropertyMatch } from "@/lib/real-estate-matching";

export async function getDeterministicMatches(
  organizationId: string,
  leadId: string,
) {
  const supabase = await createClient();
  const [profileResult, propertiesResult] = await Promise.all([
    supabase
      .from("real_estate_lead_profiles")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("lead_id", leadId)
      .maybeSingle(),
    supabase
      .from("properties")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "available")
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(500),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (propertiesResult.error) throw propertiesResult.error;
  const profile = profileResult.data;
  if (!profile) return [];

  return propertiesResult.data
    .map((property) => scorePropertyMatch(profile, property))
    .filter((match) => match.score >= 30)
    .sort((left, right) => right.score - left.score)
    .slice(0, 20);
}

export async function getLeadRealEstateData(
  organizationId: string,
  leadId: string,
) {
  const supabase = await createClient();
  const [profileResult, matchesResult, recommendations] = await Promise.all([
    supabase
      .from("real_estate_lead_profiles")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("lead_id", leadId)
      .maybeSingle(),
    supabase
      .from("property_matches")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("lead_id", leadId)
      .order("score", { ascending: false })
      .limit(100),
    getDeterministicMatches(organizationId, leadId),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (matchesResult.error) throw matchesResult.error;

  const propertyIds = matchesResult.data.map((match) => match.property_id);
  const { data: properties, error: propertiesError } = propertyIds.length
    ? await supabase
        .from("properties")
        .select("*")
        .eq("organization_id", organizationId)
        .in("id", propertyIds)
    : { data: [], error: null };
  if (propertiesError) throw propertiesError;
  const propertyMap = new Map(properties.map((property) => [property.id, property]));

  return {
    profile: profileResult.data,
    matches: matchesResult.data.flatMap((match) => {
      const property = propertyMap.get(match.property_id);
      return property ? [{ ...match, property }] : [];
    }),
    recommendations,
  };
}
