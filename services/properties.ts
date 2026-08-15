import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PropertyDetail, PropertyListItem } from "@/types/crm";
import type { PropertyStatus } from "@/types/database";

const PAGE_SIZE = 24;

export async function listProperties(
  organizationId: string,
  options: { page?: number; query?: string; status?: string } = {},
) {
  const page = Math.max(1, options.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const supabase = await createClient();
  let query = supabase
    .from("properties")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (options.status && options.status !== "all") {
    const statuses: PropertyStatus[] = [
      "available",
      "reserved",
      "sold",
      "inactive",
    ];
    if (statuses.includes(options.status as PropertyStatus)) {
      query = query.eq("status", options.status as PropertyStatus);
    }
  }
  if (options.query?.trim()) {
    const escaped = options.query.trim().replace(/[%_,]/g, "");
    query = query.or(
      `code.ilike.%${escaped}%,title.ilike.%${escaped}%,city.ilike.%${escaped}%,neighborhood.ilike.%${escaped}%`,
    );
  }

  const { data: properties, count, error } = await query;
  if (error) throw error;
  const rows = properties ?? [];
  const propertyIds = rows.map((property) => property.id);
  const responsibleIds = rows.flatMap((property) =>
    property.responsible_user_id ? [property.responsible_user_id] : [],
  );
  const [profilesResult, photosResult] = await Promise.all([
    responsibleIds.length
      ? supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", [...new Set(responsibleIds)])
      : Promise.resolve({ data: [], error: null }),
    propertyIds.length
      ? supabase
          .from("property_photos")
          .select("property_id")
          .eq("organization_id", organizationId)
          .in("property_id", propertyIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profilesResult.error) throw profilesResult.error;
  if (photosResult.error) throw photosResult.error;
  const profileMap = new Map(
    profilesResult.data.map((profile) => [profile.id, profile.full_name]),
  );
  const photoCount = new Map<string, number>();
  for (const photo of photosResult.data) {
    photoCount.set(photo.property_id, (photoCount.get(photo.property_id) ?? 0) + 1);
  }

  const items: PropertyListItem[] = rows.map((property) => ({
    ...property,
    responsible_name: property.responsible_user_id
      ? (profileMap.get(property.responsible_user_id) ?? null)
      : null,
    photo_count: photoCount.get(property.id) ?? 0,
  }));

  return {
    items,
    page,
    pageSize: PAGE_SIZE,
    total: count ?? 0,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
  };
}

export async function getPropertyDetail(
  organizationId: string,
  propertyId: string,
): Promise<PropertyDetail | null> {
  const supabase = await createClient();
  const { data: property, error } = await supabase
    .from("properties")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", propertyId)
    .maybeSingle();
  if (error) throw error;
  if (!property) return null;

  const [photosResult, matchesResult, visitsResult, eventsResult] =
    await Promise.all([
      supabase
        .from("property_photos")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("property_id", propertyId)
        .order("position"),
      supabase
        .from("property_matches")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("property_id", propertyId)
        .order("updated_at", { ascending: false })
        .limit(100),
      supabase
        .from("meetings")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("property_id", propertyId)
        .order("starts_at", { ascending: false })
        .limit(100),
      supabase
        .from("real_estate_events")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("entity_type", "property")
        .eq("entity_id", propertyId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
  const firstError =
    photosResult.error ??
    matchesResult.error ??
    visitsResult.error ??
    eventsResult.error;
  if (firstError) throw firstError;
  const photos = photosResult.data ?? [];
  const matches = matchesResult.data ?? [];
  const visits = visitsResult.data ?? [];
  const events = eventsResult.data ?? [];

  const responsibleIds = property.responsible_user_id
    ? [property.responsible_user_id]
    : [];
  const leadIds = [
    ...new Set([
      ...matches.map((match) => match.lead_id),
      ...visits.map((visit) => visit.lead_id),
    ]),
  ];
  const ownerIds = [
    ...new Set(visits.flatMap((visit) => (visit.owner_id ? [visit.owner_id] : []))),
  ];
  const [profilesResult, leadsResult] = await Promise.all([
    [...responsibleIds, ...ownerIds].length
      ? supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", [...new Set([...responsibleIds, ...ownerIds])])
      : Promise.resolve({ data: [], error: null }),
    leadIds.length
      ? supabase.from("leads").select("id, name").in("id", leadIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profilesResult.error) throw profilesResult.error;
  if (leadsResult.error) throw leadsResult.error;
  const profileMap = new Map(
    profilesResult.data.map((profile) => [profile.id, profile.full_name]),
  );
  const leadMap = new Map(leadsResult.data.map((lead) => [lead.id, lead.name]));
  const photoPaths = photos.map((photo) => photo.storage_path);
  const signedPhotos = photoPaths.length
    ? await supabase.storage
        .from("property-photos")
        .createSignedUrls(photoPaths, 60 * 60)
    : { data: [], error: null };
  if (signedPhotos.error) throw signedPhotos.error;
  const signedUrlMap = new Map(
    (signedPhotos.data ?? []).map((photo) => [photo.path, photo.signedUrl]),
  );

  return {
    ...property,
    responsible_name: property.responsible_user_id
      ? (profileMap.get(property.responsible_user_id) ?? null)
      : null,
    photos: photos.map((photo) => ({
      ...photo,
      signed_url: signedUrlMap.get(photo.storage_path) ?? null,
    })),
    matches: matches.map((match) => ({
      ...match,
      lead_name: leadMap.get(match.lead_id) ?? null,
    })),
    visits: visits.map((visit) => ({
      ...visit,
      lead_name: leadMap.get(visit.lead_id) ?? null,
      owner_name: visit.owner_id ? (profileMap.get(visit.owner_id) ?? null) : null,
    })),
    events,
  };
}

export async function listAvailableProperties(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select("id, code, title, city, neighborhood, price, property_type, purpose, bedrooms")
    .eq("organization_id", organizationId)
    .eq("status", "available")
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return data;
}
