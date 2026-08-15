"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  isAutomaticQualificationEnabled,
  qualifyLeadWithOpenAi,
} from "@/services/ai/openai";
import { requireWorkspace } from "@/services/workspace";
import { getDeterministicMatches } from "@/services/real-estate-matching";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().max(max).nullable(),
  );

const createLeadSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.preprocess(
    (value) => (value === "" ? null : value),
    z.email().max(254).nullable(),
  ),
  phone: optionalText(40),
  company: optionalText(160),
  serviceId: z.preprocess(
    (value) => (value === "" ? null : value),
    z.uuid().nullable(),
  ),
  source: optionalText(100),
  campaign: optionalText(160),
  estimatedBudget: z.preprocess(
    (value) => (value === "" ? null : value),
    z.coerce.number().min(0).max(999_999_999).nullable(),
  ),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  stageId: z.uuid(),
  summary: optionalText(2000),
  nextAction: optionalText(500),
});

export async function createLead(formData: FormData) {
  const { user, organization } = await requireWorkspace();
  const parsed = createLeadSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    company: formData.get("company"),
    serviceId: formData.get("serviceId"),
    source: formData.get("source"),
    campaign: formData.get("campaign"),
    estimatedBudget: formData.get("estimatedBudget"),
    priority: formData.get("priority"),
    stageId: formData.get("stageId"),
    summary: formData.get("summary"),
    nextAction: formData.get("nextAction"),
  });

  if (!parsed.success)
    redirect("/leads/new?error=Revise+os+campos+informados.");

  const supabase = await createClient();
  const { data: stage, error: stageError } = await supabase
    .from("pipeline_stages")
    .select("id, pipeline_id")
    .eq("id", parsed.data.stageId)
    .eq("organization_id", organization.id)
    .maybeSingle();

  if (stageError || !stage) redirect("/leads/new?error=Etapa+inválida.");

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      organization_id: organization.id,
      pipeline_id: stage.pipeline_id,
      stage_id: stage.id,
      service_id: parsed.data.serviceId,
      owner_id: user.id,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      company: parsed.data.company,
      source: parsed.data.source,
      campaign: parsed.data.campaign,
      estimated_budget: parsed.data.estimatedBudget,
      priority: parsed.data.priority,
      summary: parsed.data.summary,
      next_action: parsed.data.nextAction,
      created_by: user.id,
      custom_fields: {},
      score: 0,
    })
    .select("id")
    .single();

  if (error) {
    console.error("lead_creation_failed", { code: error.code });
    redirect("/leads/new?error=Não+foi+possível+criar+o+lead.");
  }

  if (await isAutomaticQualificationEnabled(organization.id)) {
    try {
      await qualifyLeadWithOpenAi(organization.id, lead.id);
    } catch (qualificationError) {
      const code = qualificationError instanceof Error
        ? qualificationError.message.slice(0, 100)
        : "ai_analysis_failed";
      console.error("automatic_lead_qualification_failed", { code });
    }
  }

  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  redirect(`/leads/${lead.id}`);
}

const noteSchema = z.object({
  leadId: z.uuid(),
  content: z.string().trim().min(1).max(5000),
});

export async function addLeadNote(formData: FormData) {
  const { user, organization } = await requireWorkspace();
  const parsed = noteSchema.safeParse({
    leadId: formData.get("leadId"),
    content: formData.get("content"),
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase.from("lead_notes").insert({
    organization_id: organization.id,
    lead_id: parsed.data.leadId,
    author_id: user.id,
    content: parsed.data.content,
  });

  if (error) {
    console.error("lead_note_creation_failed", { code: error.code });
    return;
  }

  revalidatePath(`/leads/${parsed.data.leadId}`);
  revalidatePath("/pipeline");
}

const updateLeadSchema = createLeadSchema.omit({ stageId: true }).extend({
  leadId: z.uuid(),
  ownerId: z.preprocess(
    (value) => (value === "" ? null : value),
    z.uuid().nullable(),
  ),
  score: z.coerce.number().int().min(0).max(100),
  tagIds: z.array(z.uuid()).max(30),
});

export async function updateLead(formData: FormData) {
  const { organization } = await requireWorkspace();
  const parsed = updateLeadSchema.safeParse({
    leadId: formData.get("leadId"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    company: formData.get("company"),
    serviceId: formData.get("serviceId"),
    ownerId: formData.get("ownerId"),
    source: formData.get("source"),
    campaign: formData.get("campaign"),
    estimatedBudget: formData.get("estimatedBudget"),
    priority: formData.get("priority"),
    score: formData.get("score"),
    summary: formData.get("summary"),
    nextAction: formData.get("nextAction"),
    tagIds: formData.getAll("tagIds"),
  });
  if (!parsed.success) {
    const leadId = formData.get("leadId");
    redirect(
      `/leads/${String(leadId)}/edit?error=Revise+os+campos+informados.`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_lead_details", {
    p_organization_id: organization.id,
    p_lead_id: parsed.data.leadId,
    p_name: parsed.data.name,
    p_email: parsed.data.email ?? "",
    p_phone: parsed.data.phone ?? "",
    p_company: parsed.data.company ?? "",
    p_service_id: parsed.data.serviceId,
    p_owner_id: parsed.data.ownerId,
    p_source: parsed.data.source ?? "",
    p_campaign: parsed.data.campaign ?? "",
    p_estimated_budget: parsed.data.estimatedBudget,
    p_priority: parsed.data.priority,
    p_score: parsed.data.score,
    p_summary: parsed.data.summary ?? "",
    p_next_action: parsed.data.nextAction ?? "",
    p_tag_ids: parsed.data.tagIds,
  });
  if (error) {
    console.error("lead_update_failed", { code: error.code });
    redirect(
      `/leads/${parsed.data.leadId}/edit?error=Não+foi+possível+salvar+o+lead.`,
    );
  }
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  redirect(`/leads/${parsed.data.leadId}`);
}

export async function setLeadArchived(formData: FormData) {
  const { organization } = await requireWorkspace();
  const parsed = z
    .object({ leadId: z.uuid(), archived: z.enum(["true", "false"]) })
    .safeParse({
      leadId: formData.get("leadId"),
      archived: formData.get("archived"),
    });
  if (!parsed.success) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_lead_archived", {
    p_organization_id: organization.id,
    p_lead_id: parsed.data.leadId,
    p_archived: parsed.data.archived === "true",
  });
  if (error) console.error("lead_archive_failed", { code: error.code });
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  redirect("/leads");
}

export async function deleteLead(formData: FormData) {
  const { organization } = await requireWorkspace();
  if (!["owner", "admin"].includes(organization.role)) return;
  const leadId = z.uuid().safeParse(formData.get("leadId"));
  if (!leadId.success) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("organization_id", organization.id)
    .eq("id", leadId.data);
  if (error) {
    console.error("lead_delete_failed", { code: error.code });
    redirect(`/leads/${leadId.data}?error=Não+foi+possível+excluir+o+lead.`);
  }
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  redirect("/leads");
}

export async function qualifyLead(formData: FormData) {
  const { organization } = await requireWorkspace();
  const leadId = z.uuid().safeParse(formData.get("leadId"));
  if (!leadId.success) return;
  try {
    await qualifyLeadWithOpenAi(organization.id, leadId.data);
  } catch (error) {
    const code = error instanceof Error ? error.message : "ai_analysis_failed";
    console.error("lead_ai_qualification_failed", { code: code.slice(0, 100) });
    const message = code.includes("limit")
      ? "O limite mensal de análises foi atingido."
      : code.includes("not_connected") || code.includes("missing")
        ? "Conecte e teste a OpenAI antes de qualificar o lead."
        : "A IA não conseguiu analisar agora. O lead permaneceu salvo sem alterações.";
    redirect(`/leads/${leadId.data}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/leads/${leadId.data}`);
  revalidatePath("/leads");
  revalidatePath("/pipeline");
  redirect(`/leads/${leadId.data}?message=${encodeURIComponent("Lead qualificado com IA.")}`);
}

const nullableProfileNumber = (schema: z.ZodNumber) =>
  z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.coerce.number().pipe(schema).nullable(),
  );

const realEstateProfileSchema = z.object({
  leadId: z.uuid(),
  budgetMin: nullableProfileNumber(z.number().min(0).max(999_999_999_999)),
  budgetMax: nullableProfileNumber(z.number().min(0).max(999_999_999_999)),
  preferredCity: optionalText(120),
  preferredNeighborhood: optionalText(120),
  propertyType: z.preprocess(
    (value) => (value === "" ? null : value),
    z.enum(["apartment", "house", "commercial", "land", "rural", "other"]).nullable(),
  ),
  purpose: z.preprocess(
    (value) => (value === "" ? null : value),
    z.enum(["sale", "rent"]).nullable(),
  ),
  minimumBedrooms: nullableProfileNumber(z.number().int().min(0).max(100)),
  paymentMethod: z.preprocess(
    (value) => (value === "" ? null : value),
    z.enum(["cash", "financing", "consortium", "exchange", "other"]).nullable(),
  ),
  availableDownPayment: nullableProfileNumber(z.number().min(0).max(999_999_999_999)),
  urgency: z.preprocess(
    (value) => (value === "" ? null : value),
    z.enum(["low", "medium", "high", "immediate"]).nullable(),
  ),
  purchaseDeadline: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().date().nullable(),
  ),
}).refine(
  (data) => data.budgetMin === null || data.budgetMax === null || data.budgetMax >= data.budgetMin,
  { message: "Faixa de orçamento inválida" },
);

export async function saveRealEstateLeadProfile(formData: FormData) {
  const { user, organization } = await requireWorkspace();
  if (organization.vertical !== "real_estate") return;
  const parsed = realEstateProfileSchema.safeParse({
    leadId: formData.get("leadId"),
    budgetMin: formData.get("budgetMin"),
    budgetMax: formData.get("budgetMax"),
    preferredCity: formData.get("preferredCity"),
    preferredNeighborhood: formData.get("preferredNeighborhood"),
    propertyType: formData.get("propertyType"),
    purpose: formData.get("purpose"),
    minimumBedrooms: formData.get("minimumBedrooms"),
    paymentMethod: formData.get("paymentMethod"),
    availableDownPayment: formData.get("availableDownPayment"),
    urgency: formData.get("urgency"),
    purchaseDeadline: formData.get("purchaseDeadline"),
  });
  const fallbackLeadId = String(formData.get("leadId") ?? "");
  if (!parsed.success) redirect(`/leads/${fallbackLeadId}?error=Revise+o+perfil+imobiliário.`);
  const supabase = await createClient();
  const { error } = await supabase.from("real_estate_lead_profiles").upsert(
    {
      organization_id: organization.id,
      lead_id: parsed.data.leadId,
      budget_min: parsed.data.budgetMin,
      budget_max: parsed.data.budgetMax,
      preferred_city: parsed.data.preferredCity,
      preferred_neighborhood: parsed.data.preferredNeighborhood,
      property_type: parsed.data.propertyType,
      purpose: parsed.data.purpose,
      minimum_bedrooms: parsed.data.minimumBedrooms,
      payment_method: parsed.data.paymentMethod,
      available_down_payment: parsed.data.availableDownPayment,
      urgency: parsed.data.urgency,
      purchase_deadline: parsed.data.purchaseDeadline,
      created_by: user.id,
    },
    { onConflict: "lead_id" },
  );
  if (error) {
    console.error("real_estate_profile_save_failed", { code: error.code });
    redirect(`/leads/${parsed.data.leadId}?error=Não+foi+possível+salvar+o+perfil.`);
  }
  revalidatePath(`/leads/${parsed.data.leadId}`);
  redirect(`/leads/${parsed.data.leadId}?message=Perfil+imobiliário+salvo.`);
}

export async function recommendProperty(formData: FormData) {
  const { user, organization } = await requireWorkspace();
  if (organization.vertical !== "real_estate") return;
  const parsed = z.object({ leadId: z.uuid(), propertyId: z.uuid() }).safeParse({
    leadId: formData.get("leadId"),
    propertyId: formData.get("propertyId"),
  });
  if (!parsed.success) return;
  const recommendations = await getDeterministicMatches(organization.id, parsed.data.leadId);
  const recommendation = recommendations.find((item) => item.property.id === parsed.data.propertyId);
  if (!recommendation) redirect(`/leads/${parsed.data.leadId}?error=Este+imóvel+não+atende+aos+critérios+atuais.`);
  const supabase = await createClient();
  const { error } = await supabase.from("property_matches").upsert(
    {
      organization_id: organization.id,
      lead_id: parsed.data.leadId,
      property_id: recommendation.property.id,
      score: recommendation.score,
      match_reason: recommendation.reasons.join(", "),
      status: "recommended",
      created_by: user.id,
    },
    { onConflict: "organization_id,lead_id,property_id" },
  );
  if (error) {
    console.error("property_recommendation_failed", { code: error.code });
    redirect(`/leads/${parsed.data.leadId}?error=Não+foi+possível+salvar+a+recomendação.`);
  }
  revalidatePath(`/leads/${parsed.data.leadId}`);
  revalidatePath(`/properties/${parsed.data.propertyId}`);
  revalidatePath("/dashboard");
  redirect(`/leads/${parsed.data.leadId}?message=Imóvel+recomendado.`);
}

export async function updatePropertyMatchStatus(formData: FormData) {
  const { organization } = await requireWorkspace();
  if (organization.vertical !== "real_estate") return;
  const parsed = z.object({
    leadId: z.uuid(),
    matchId: z.uuid(),
    status: z.enum(["recommended", "sent", "favorite", "rejected", "visit_scheduled"]),
  }).safeParse({
    leadId: formData.get("leadId"),
    matchId: formData.get("matchId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("property_matches")
    .update({ status: parsed.data.status })
    .eq("organization_id", organization.id)
    .eq("lead_id", parsed.data.leadId)
    .eq("id", parsed.data.matchId);
  if (error) console.error("property_match_status_failed", { code: error.code });
  revalidatePath(`/leads/${parsed.data.leadId}`);
}
