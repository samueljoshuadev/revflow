import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  ProposalDetail,
  ProposalListItem,
  UnitProposalSummary,
} from "@/types/crm";
import type { PropertyProposalStatus, Tables } from "@/types/database";

const PAGE_SIZE = 30;
const SIGNED_URL_SECONDS = 10 * 60;

const proposalStatuses: PropertyProposalStatus[] = [
  "draft",
  "queued",
  "in_review",
  "countered",
  "approved",
  "rejected",
  "expired",
  "cancelled",
];

/** Completa propostas com unidade, empreendimento, comprador e corretor (sem N+1). */
async function enrichProposals(
  organizationId: string,
  proposals: Tables<"property_proposals">[],
): Promise<ProposalListItem[]> {
  if (proposals.length === 0) return [];
  const supabase = await createClient();
  const unitIds = [...new Set(proposals.map((proposal) => proposal.unit_id))];
  const proposalIds = proposals.map((proposal) => proposal.id);
  const brokerIds = [
    ...new Set(proposals.flatMap((proposal) => (proposal.broker_user_id ? [proposal.broker_user_id] : []))),
  ];

  const [unitsResult, buyersResult, profilesResult] = await Promise.all([
    supabase
      .from("development_units")
      .select("id, code, development_id")
      .eq("organization_id", organizationId)
      .in("id", unitIds),
    supabase
      .from("proposal_parties")
      .select("proposal_id, full_name")
      .eq("organization_id", organizationId)
      .eq("role", "buyer")
      .in("proposal_id", proposalIds),
    brokerIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", brokerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const firstError = unitsResult.error ?? buyersResult.error ?? profilesResult.error;
  if (firstError) throw firstError;

  const units = unitsResult.data ?? [];
  const developmentIds = [...new Set(units.map((unit) => unit.development_id))];
  const { data: developments, error: developmentsError } = await supabase
    .from("developments")
    .select("id, name")
    .eq("organization_id", organizationId)
    .in("id", developmentIds);
  if (developmentsError) throw developmentsError;

  const unitMap = new Map(units.map((unit) => [unit.id, unit]));
  const developmentMap = new Map((developments ?? []).map((development) => [development.id, development.name]));
  const buyerMap = new Map((buyersResult.data ?? []).map((buyer) => [buyer.proposal_id, buyer.full_name]));
  const profileMap = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.full_name]));

  return proposals.map((proposal) => {
    const unit = unitMap.get(proposal.unit_id);
    return {
      ...proposal,
      unit_code: unit?.code ?? "—",
      development_id: unit?.development_id ?? "",
      development_name: unit ? (developmentMap.get(unit.development_id) ?? "—") : "—",
      buyer_name: buyerMap.get(proposal.id) ?? null,
      broker_name: proposal.broker_user_id ? (profileMap.get(proposal.broker_user_id) ?? null) : null,
    };
  });
}

/** Lista as propostas visíveis ao usuário (RLS decide: admin vê todas). */
export async function listProposals(
  organizationId: string,
  options: { page?: number; status?: string } = {},
) {
  const page = Math.max(1, options.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const supabase = await createClient();
  let query = supabase
    .from("property_proposals")
    .select("*", { count: "exact" })
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (options.status === "open") {
    query = query.in("status", ["draft", "queued", "in_review", "countered"]);
  } else if (proposalStatuses.includes(options.status as PropertyProposalStatus)) {
    query = query.eq("status", options.status as PropertyProposalStatus);
  }
  const { data, count, error } = await query;
  if (error) throw error;
  return {
    items: await enrichProposals(organizationId, data ?? []),
    page,
    total: count ?? 0,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
  };
}

export async function getUnitProposalSummary(
  organizationId: string,
  unitId: string,
): Promise<UnitProposalSummary> {
  const supabase = await createClient();
  const [queueResult, proposalsResult] = await Promise.all([
    supabase.rpc("get_unit_proposal_queue", {
      p_organization_id: organizationId,
      p_unit_id: unitId,
    }),
    supabase
      .from("property_proposals")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("unit_id", unitId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (queueResult.error) throw queueResult.error;
  if (proposalsResult.error) throw proposalsResult.error;
  const queue = (queueResult.data ?? {}) as { has_active?: boolean; queued?: number };
  return {
    hasActive: Boolean(queue.has_active),
    queued: Number(queue.queued ?? 0),
    visible: await enrichProposals(organizationId, proposalsResult.data ?? []),
  };
}

export async function getProposalDetail(
  organizationId: string,
  proposalId: string,
): Promise<ProposalDetail | null> {
  const supabase = await createClient();
  const { data: proposal, error } = await supabase
    .from("property_proposals")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", proposalId)
    .maybeSingle();
  if (error) throw error;
  if (!proposal) return null;

  const [unitResult, partiesResult, documentsResult, eventsResult, missingResult] =
    await Promise.all([
      supabase
        .from("development_units")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("id", proposal.unit_id)
        .single(),
      supabase
        .from("proposal_parties")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("proposal_id", proposalId)
        .order("created_at")
        .limit(10),
      supabase
        .from("proposal_documents")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("proposal_id", proposalId)
        .order("created_at")
        .limit(100),
      supabase
        .from("real_estate_events")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("entity_type", "proposal")
        .eq("entity_id", proposalId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.rpc("get_proposal_missing_requirements", { p_proposal_id: proposalId }),
    ]);
  const firstError =
    unitResult.error ?? partiesResult.error ?? documentsResult.error ?? eventsResult.error ?? missingResult.error;
  if (firstError) throw firstError;

  const unit = unitResult.data;
  if (!unit) return null;
  const peopleIds = [
    ...new Set(
      [proposal.broker_user_id, proposal.manager_user_id, proposal.director_user_id, proposal.decided_by].filter(
        (value): value is string => Boolean(value),
      ),
    ),
  ];
  const documents = documentsResult.data ?? [];
  const [developmentResult, profilesResult, partnerResult, leadResult, signedResult] = await Promise.all([
    supabase
      .from("developments")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", unit.development_id)
      .single(),
    peopleIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", peopleIds)
      : Promise.resolve({ data: [], error: null }),
    proposal.partner_agency_id
      ? supabase
          .from("partner_agencies")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("id", proposal.partner_agency_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    proposal.lead_id
      ? supabase
          .from("leads")
          .select("id, name")
          .eq("organization_id", organizationId)
          .eq("id", proposal.lead_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    documents.length
      ? supabase.storage
          .from("proposal-documents")
          .createSignedUrls(documents.map((document) => document.storage_path), SIGNED_URL_SECONDS)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const secondError =
    developmentResult.error ?? profilesResult.error ?? partnerResult.error ?? leadResult.error ?? signedResult.error;
  if (secondError) throw secondError;
  const development = developmentResult.data;
  if (!development) return null;

  const profileMap = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.full_name]));
  const signedMap = new Map((signedResult.data ?? []).map((item) => [item.path, item.signedUrl]));
  const parties = partiesResult.data ?? [];
  const name = (id: string | null) => (id ? (profileMap.get(id) ?? null) : null);

  return {
    ...proposal,
    unit_code: unit.code,
    development_id: unit.development_id,
    development_name: development.name,
    buyer_name: parties.find((party) => party.role === "buyer")?.full_name ?? null,
    broker_name: name(proposal.broker_user_id),
    manager_name: name(proposal.manager_user_id),
    director_name: name(proposal.director_user_id),
    decided_by_name: name(proposal.decided_by),
    unit,
    development,
    parties,
    documents: documents.map((document) => ({
      ...document,
      signed_url: signedMap.get(document.storage_path) ?? null,
    })),
    events: eventsResult.data ?? [],
    missing: missingResult.data ?? [],
    partner_agency: partnerResult.data,
    lead: leadResult.data,
  };
}

export async function listPartnerAgencies(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partner_agencies")
    .select("*")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("name")
    .limit(200);
  if (error) throw error;
  return data;
}

/** Leads recentes do corretor para vincular à proposta. */
export async function listLeadsForProposal(organizationId: string, userId: string, isAdmin: boolean) {
  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select("id, name, phone, email")
    .eq("organization_id", organizationId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (!isAdmin) query = query.eq("owner_id", userId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** Unidade e empreendimento para abrir uma nova proposta. */
export async function getUnitForProposal(organizationId: string, unitId: string) {
  const supabase = await createClient();
  const { data: unit, error } = await supabase
    .from("development_units")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", unitId)
    .maybeSingle();
  if (error) throw error;
  if (!unit) return null;
  const [developmentResult, queueResult] = await Promise.all([
    supabase
      .from("developments")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", unit.development_id)
      .is("archived_at", null)
      .maybeSingle(),
    supabase.rpc("get_unit_proposal_queue", {
      p_organization_id: organizationId,
      p_unit_id: unitId,
    }),
  ]);
  if (developmentResult.error) throw developmentResult.error;
  if (queueResult.error) throw queueResult.error;
  if (!developmentResult.data) return null;
  const queue = (queueResult.data ?? {}) as { has_active?: boolean; queued?: number };
  return {
    unit,
    development: developmentResult.data,
    hasActive: Boolean(queue.has_active),
    queued: Number(queue.queued ?? 0),
  };
}
