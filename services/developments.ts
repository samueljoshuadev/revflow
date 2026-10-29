import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { DevelopmentDetail, DevelopmentSummary } from "@/types/crm";
import type { PropertyStatus } from "@/types/database";

const UNIT_STATUSES: PropertyStatus[] = ["available", "reserved", "sold", "inactive"];

const UNITS_PAGE_SIZE = 200;

export async function listDevelopmentSummaries(
  organizationId: string,
): Promise<DevelopmentSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_development_summary", {
    p_organization_id: organizationId,
  });
  if (error) throw error;
  return (data ?? []) as DevelopmentSummary[];
}

export async function getDevelopmentDetail(
  organizationId: string,
  slug: string,
  options: { page?: number; status?: string } = {},
): Promise<DevelopmentDetail | null> {
  const page = Math.max(1, options.page ?? 1);
  const from = (page - 1) * UNITS_PAGE_SIZE;
  const supabase = await createClient();

  const { data: development, error } = await supabase
    .from("developments")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("slug", slug)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!development) return null;

  let unitsQuery = supabase
    .from("properties")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .eq("development_id", development.id)
    .is("archived_at", null)
    .order("code")
    .range(from, from + UNITS_PAGE_SIZE - 1);
  if (
    options.status &&
    options.status !== "all" &&
    UNIT_STATUSES.includes(options.status as PropertyStatus)
  ) {
    unitsQuery = unitsQuery.eq("status", options.status as PropertyStatus);
  }

  const { data: units, count, error: unitsError } = await unitsQuery;
  if (unitsError) throw unitsError;
  const rows = units ?? [];

  const { data: terms, error: termsError } = rows.length
    ? await supabase
        .from("property_sale_terms")
        .select("*")
        .eq("organization_id", organizationId)
        .in(
          "property_id",
          rows.map((unit) => unit.id),
        )
    : { data: [], error: null };
  if (termsError) throw termsError;
  const termsMap = new Map((terms ?? []).map((term) => [term.property_id, term]));

  return {
    ...development,
    units: rows.map((unit) => ({ ...unit, sale_terms: termsMap.get(unit.id) ?? null })),
    page,
    pageSize: UNITS_PAGE_SIZE,
    total: count ?? 0,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / UNITS_PAGE_SIZE)),
  };
}

export async function listDevelopmentOptions(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("developments")
    .select("id, slug, name, city, property_type")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("name")
    .limit(200);
  if (error) throw error;
  return data;
}
