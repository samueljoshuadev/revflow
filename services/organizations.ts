import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export const ACTIVE_ORGANIZATION_COOKIE = "orbit_active_organization";

export type CurrentOrganization = Tables<"organizations"> & {
  role: Tables<"organization_members">["role"];
};

export const getCurrentOrganization = cache(
  async function getCurrentOrganization(
    userId: string,
  ): Promise<CurrentOrganization | null> {
    const supabase = await createClient();
    const cookieStore = await cookies();
    const preferredOrganizationId = cookieStore.get(
      ACTIVE_ORGANIZATION_COOKIE,
    )?.value;
    let membershipQuery = supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (preferredOrganizationId) {
      membershipQuery = membershipQuery.eq(
        "organization_id",
        preferredOrganizationId,
      );
    }

    const { data: memberships, error: membershipError } =
      await membershipQuery.limit(1);

    if (membershipError) throw membershipError;
    let membership = memberships[0] ?? null;
    if (!membership && preferredOrganizationId) {
      const { data: fallback, error: fallbackError } = await supabase
        .from("organization_members")
        .select("organization_id, role")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1);
      if (fallbackError) throw fallbackError;
      membership = fallback[0] ?? null;
    }
    if (!membership) return null;

    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", membership.organization_id)
      .single();

    if (organizationError) throw organizationError;
    return { ...organization, role: membership.role };
  },
);

export async function listUserOrganizations(userId: string) {
  const supabase = await createClient();
  const { data: memberships, error } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .order("created_at");
  if (error) throw error;
  if (memberships.length === 0) return [];

  const { data: organizations, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, slug, vertical")
    .in(
      "id",
      memberships.map((membership) => membership.organization_id),
    );
  if (organizationError) throw organizationError;
  const organizationMap = new Map(
    organizations.map((organization) => [organization.id, organization]),
  );

  return memberships.flatMap((membership) => {
    const organization = organizationMap.get(membership.organization_id);
    return organization ? [{ ...organization, role: membership.role }] : [];
  });
}

export async function getOrganizationMembers(organizationId: string) {
  const supabase = await createClient();
  const { data: memberships, error } = await supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("organization_id", organizationId)
    .order("created_at");

  if (error) throw error;
  const profileIds = memberships.map((membership) => membership.user_id);
  if (profileIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", profileIds);

  if (profilesError) throw profilesError;
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  return memberships.map((membership) => ({
    ...membership,
    profile: profileMap.get(membership.user_id) ?? null,
  }));
}
