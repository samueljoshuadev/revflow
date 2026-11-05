import "server-only";

import { createClient } from "@/lib/supabase/server";
import { buildMirror } from "@/lib/developments";
import type {
  DevelopmentListItem,
  DevelopmentMirror,
  DevelopmentUnitDetail,
} from "@/types/crm";
import type { DevelopmentOverviewRow } from "@/types/database";

const LIST_LIMIT = 100;
/** Limite de unidades carregadas por espelho; acima disso a tela avisa. */
export const MIRROR_UNIT_LIMIT = 3000;

const emptyOverview: DevelopmentListItem["overview"] = {
  total_units: 0,
  available_units: 0,
  in_proposal_units: 0,
  reserved_units: 0,
  sold_units: 0,
  rented_units: 0,
  blocked_units: 0,
  total_vgv: 0,
  sold_vgv: 0,
  available_vgv: 0,
};

function toOverview(row: DevelopmentOverviewRow | undefined) {
  if (!row) return emptyOverview;
  return {
    total_units: row.total_units,
    available_units: row.available_units,
    in_proposal_units: row.in_proposal_units,
    reserved_units: row.reserved_units,
    sold_units: row.sold_units,
    rented_units: row.rented_units,
    blocked_units: row.blocked_units,
    total_vgv: Number(row.total_vgv),
    sold_vgv: Number(row.sold_vgv),
    available_vgv: Number(row.available_vgv),
  };
}

async function getOverviewMap(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_developments_overview", {
    p_organization_id: organizationId,
  });
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.development_id, row]));
}

export async function listDevelopments(
  organizationId: string,
): Promise<DevelopmentListItem[]> {
  const supabase = await createClient();
  const [developmentsResult, overviewMap] = await Promise.all([
    supabase
      .from("developments")
      .select("*")
      .eq("organization_id", organizationId)
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(LIST_LIMIT),
    getOverviewMap(organizationId),
  ]);
  if (developmentsResult.error) throw developmentsResult.error;
  return developmentsResult.data.map((development) => ({
    ...development,
    overview: toOverview(overviewMap.get(development.id)),
  }));
}

export async function getDevelopmentMirror(
  organizationId: string,
  developmentId: string,
): Promise<DevelopmentMirror | null> {
  const supabase = await createClient();
  const { data: development, error } = await supabase
    .from("developments")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", developmentId)
    .is("archived_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!development) return null;

  const [towersResult, unitsResult, overviewMap] = await Promise.all([
    supabase
      .from("development_towers")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("development_id", developmentId)
      .order("position")
      .order("name")
      .limit(200),
    supabase
      .from("development_units")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId)
      .eq("development_id", developmentId)
      .order("floor", { ascending: false, nullsFirst: false })
      .order("position")
      .limit(MIRROR_UNIT_LIMIT),
    getOverviewMap(organizationId),
  ]);
  if (towersResult.error) throw towersResult.error;
  if (unitsResult.error) throw unitsResult.error;

  const units = unitsResult.data ?? [];
  const unitCount = unitsResult.count ?? units.length;
  return {
    ...development,
    overview: toOverview(overviewMap.get(development.id)),
    towers: towersResult.data,
    mirror: buildMirror(towersResult.data, units),
    unitCount,
    truncated: unitCount > units.length,
  };
}

export async function getDevelopmentUnitDetail(
  organizationId: string,
  developmentId: string,
  unitId: string,
): Promise<DevelopmentUnitDetail | null> {
  const supabase = await createClient();
  const { data: unit, error } = await supabase
    .from("development_units")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("development_id", developmentId)
    .eq("id", unitId)
    .maybeSingle();
  if (error) throw error;
  if (!unit) return null;

  const [towerResult, profileResult, eventsResult] = await Promise.all([
    unit.tower_id
      ? supabase
          .from("development_towers")
          .select("name")
          .eq("organization_id", organizationId)
          .eq("id", unit.tower_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    unit.status_changed_by
      ? supabase
          .from("profiles")
          .select("full_name")
          .eq("id", unit.status_changed_by)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("real_estate_events")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("entity_type", "development_unit")
      .eq("entity_id", unitId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  const firstError = towerResult.error ?? profileResult.error ?? eventsResult.error;
  if (firstError) throw firstError;

  return {
    ...unit,
    tower_name: towerResult.data?.name ?? null,
    status_changed_by_name: profileResult.data?.full_name ?? null,
    events: eventsResult.data ?? [],
  };
}

export async function getDevelopmentSettings(
  organizationId: string,
  developmentId: string,
) {
  const supabase = await createClient();
  const [developmentResult, towersResult] = await Promise.all([
    supabase
      .from("developments")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", developmentId)
      .is("archived_at", null)
      .maybeSingle(),
    supabase
      .from("development_towers")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("development_id", developmentId)
      .order("position")
      .order("name")
      .limit(200),
  ]);
  if (developmentResult.error) throw developmentResult.error;
  if (towersResult.error) throw towersResult.error;
  if (!developmentResult.data) return null;
  return { development: developmentResult.data, towers: towersResult.data };
}
