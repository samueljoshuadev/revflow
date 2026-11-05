"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { normalizeCpf } from "@/lib/proposals";
import { createClient } from "@/lib/supabase/server";
import { requireRealEstateWorkspace } from "@/services/workspace";

/** Limite por documento: cabe no corpo de função da Vercel (4,5 MB). */
const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;

const emptyToNull = (value: unknown) =>
  value === "" || value === null || value === undefined ? null : value;

const nullableText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable());

/** Aceita "450.000,00" e "450000.00". */
const parseMoney = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed;
};
const money = z.preprocess(parseMoney, z.coerce.number().min(0).max(999_999_999_999));
const optionalMoney = z.preprocess(
  (value) => parseMoney(value) ?? 0,
  z.coerce.number().min(0).max(999_999_999_999),
);

function proposalUrl(id: string, params: Record<string, string> = {}) {
  const search = new URLSearchParams(params).toString();
  return `/proposals/${id}${search ? `?${search}` : ""}`;
}

/** Converte erros das funções do banco em mensagens para o usuário (sem expor detalhes). */
function databaseMessage(error: { code?: string; message?: string }) {
  const message = error.message ?? "";
  if (message.includes("unit_unavailable")) return "Esta unidade não está mais disponível para propostas.";
  if (message.includes("not_allowed") || error.code === "42501") return "Você não tem permissão para esta ação.";
  if (message.includes("invalid_status")) return "A proposta mudou de situação. Atualize a página.";
  if (message.includes("counter_price_required")) return "Informe o valor da contraproposta.";
  if (error.code === "23514") return "Revise os valores: entrada + FGTS + financiamento não podem passar do valor ofertado.";
  if (error.code === "23505") return "Este registro já existe.";
  return "Não foi possível concluir a ação.";
}

function revalidateProposal(id: string, developmentId?: string) {
  revalidatePath("/proposals");
  revalidatePath(`/proposals/${id}`);
  revalidatePath("/developments");
  if (developmentId) revalidatePath(`/developments/${developmentId}`);
}

async function getProposalRef(organizationId: string, proposalId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("property_proposals")
    .select("id, unit_id, status")
    .eq("organization_id", organizationId)
    .eq("id", proposalId)
    .maybeSingle();
  if (error || !data) redirect("/proposals?error=Proposta+não+encontrada.");
  const { data: unit } = await supabase
    .from("development_units")
    .select("development_id")
    .eq("organization_id", organizationId)
    .eq("id", data.unit_id)
    .maybeSingle();
  return { ...data, developmentId: unit?.development_id };
}

// ---------------------------------------------------------------------------
// Criar e editar
// ---------------------------------------------------------------------------

const createSchema = z.object({
  unitId: z.uuid(),
  offeredPrice: money.pipe(z.number().gt(0)),
  downPayment: optionalMoney,
  fgtsAmount: optionalMoney,
  financingAmount: optionalMoney,
  paymentNotes: nullableText(2000),
  buyerName: z.string().trim().min(2).max(180),
  buyerPhone: nullableText(30),
  buyerEmail: z.preprocess(emptyToNull, z.email().max(254).nullable()),
  leadId: z.preprocess(emptyToNull, z.uuid().nullable()),
  partnerAgencyId: z.preprocess(emptyToNull, z.uuid().nullable()),
  externalBrokerName: nullableText(180),
  externalBrokerPhone: nullableText(30),
  externalBrokerCreci: nullableText(40),
});

export async function createProposal(formData: FormData) {
  const { organization } = await requireRealEstateWorkspace();
  const unitId = z.uuid().safeParse(formData.get("unitId"));
  if (!unitId.success) redirect("/developments?error=Unidade+inválida.");
  const backUrl = `/proposals/new?unit=${unitId.data}`;
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`${backUrl}&error=Revise+os+dados+da+proposta.`);
  const data = parsed.data;
  if (data.downPayment + data.fgtsAmount + data.financingAmount > data.offeredPrice + 0.01) {
    redirect(`${backUrl}&error=Entrada+%2B+FGTS+%2B+financiamento+passam+do+valor+ofertado.`);
  }

  const supabase = await createClient();
  const { data: proposalId, error } = await supabase.rpc("create_property_proposal", {
    p_organization_id: organization.id,
    p_unit_id: data.unitId,
    p_offered_price: data.offeredPrice,
    p_down_payment: data.downPayment,
    p_fgts_amount: data.fgtsAmount,
    p_financing_amount: data.financingAmount,
    p_payment_notes: data.paymentNotes,
    p_buyer_name: data.buyerName,
    p_buyer_phone: data.buyerPhone,
    p_buyer_email: data.buyerEmail,
    p_lead_id: data.leadId,
    p_partner_agency_id: data.partnerAgencyId,
    p_external_broker_name: data.externalBrokerName,
    p_external_broker_phone: data.externalBrokerPhone,
    p_external_broker_creci: data.externalBrokerCreci,
  });
  if (error || !proposalId) {
    console.error("property_proposal_creation_failed", { code: error?.code });
    redirect(`${backUrl}&error=${encodeURIComponent(error ? databaseMessage(error) : "Falha ao criar.")}`);
  }
  revalidatePath("/proposals");
  redirect(proposalUrl(proposalId, { message: "Rascunho criado. Complete os dados e envie os documentos." }));
}

const termsSchema = z.object({
  proposalId: z.uuid(),
  offeredPrice: money.pipe(z.number().gt(0)),
  downPayment: optionalMoney,
  fgtsAmount: optionalMoney,
  financingAmount: optionalMoney,
  paymentNotes: nullableText(2000),
  notes: nullableText(2000),
});

export async function updateProposalTerms(formData: FormData) {
  const { organization } = await requireRealEstateWorkspace();
  const parsed = termsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/proposals?error=Dados+inválidos.");
  const data = parsed.data;
  const proposal = await getProposalRef(organization.id, data.proposalId);
  if (data.downPayment + data.fgtsAmount + data.financingAmount > data.offeredPrice + 0.01) {
    redirect(proposalUrl(proposal.id, { error: "Entrada + FGTS + financiamento passam do valor ofertado." }));
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_property_proposal_terms", {
    p_organization_id: organization.id,
    p_proposal_id: proposal.id,
    p_offered_price: data.offeredPrice,
    p_down_payment: data.downPayment,
    p_fgts_amount: data.fgtsAmount,
    p_financing_amount: data.financingAmount,
    p_payment_notes: data.paymentNotes,
    p_notes: data.notes,
  });
  if (error) {
    console.error("property_proposal_update_failed", { code: error.code });
    redirect(proposalUrl(proposal.id, { error: databaseMessage(error) }));
  }
  revalidateProposal(proposal.id);
  redirect(proposalUrl(proposal.id, { message: "Valores salvos." }));
}

// ---------------------------------------------------------------------------
// Compradores
// ---------------------------------------------------------------------------

const partySchema = z.object({
  proposalId: z.uuid(),
  partyId: z.preprocess(emptyToNull, z.uuid().nullable()),
  role: z.enum(["buyer", "spouse", "co_buyer"]),
  fullName: z.string().trim().min(2).max(180),
  cpf: z.preprocess(emptyToNull, z.string().nullable()),
  rg: z.preprocess(emptyToNull, z.string().trim().min(3).max(30).nullable()),
  birthDate: z.preprocess(emptyToNull, z.iso.date().nullable()),
  maritalStatus: z.preprocess(
    emptyToNull,
    z.enum(["single", "married", "stable_union", "divorced", "widowed"]).nullable(),
  ),
  email: z.preprocess(emptyToNull, z.email().max(254).nullable()),
  phone: z.preprocess(emptyToNull, z.string().trim().min(8).max(30).nullable()),
  occupation: nullableText(120),
  incomeType: z.preprocess(
    emptyToNull,
    z.enum(["clt", "pro_labore", "self_employed", "retired", "other", "none"]).nullable(),
  ),
  grossMonthlyIncome: z.preprocess(
    (value) => parseMoney(value),
    z.coerce.number().min(0).max(999_999_999).nullable(),
  ),
  address: nullableText(300),
});

export async function saveProposalParty(formData: FormData) {
  const { organization } = await requireRealEstateWorkspace();
  const parsed = partySchema.safeParse(Object.fromEntries(formData));
  const rawId = z.uuid().safeParse(formData.get("proposalId"));
  if (!parsed.success) {
    redirect(rawId.success ? proposalUrl(rawId.data, { error: "Revise os dados do participante." }) : "/proposals");
  }
  const data = parsed.data;
  const proposal = await getProposalRef(organization.id, data.proposalId);
  let cpf: string | null = null;
  if (data.cpf) {
    cpf = normalizeCpf(data.cpf);
    if (!cpf) redirect(proposalUrl(proposal.id, { error: "CPF inválido." }));
  }
  const row = {
    full_name: data.fullName,
    cpf,
    rg: data.rg,
    birth_date: data.birthDate,
    marital_status: data.maritalStatus,
    email: data.email?.toLowerCase() ?? null,
    phone: data.phone,
    occupation: data.occupation,
    income_type: data.incomeType,
    gross_monthly_income: data.grossMonthlyIncome,
    address: data.address,
  };
  const supabase = await createClient();
  const result = data.partyId
    ? await supabase
        .from("proposal_parties")
        .update(row)
        .eq("organization_id", organization.id)
        .eq("proposal_id", proposal.id)
        .eq("id", data.partyId)
        .select("id")
    : await supabase
        .from("proposal_parties")
        .insert({ ...row, organization_id: organization.id, proposal_id: proposal.id, role: data.role })
        .select("id");
  if (result.error || !result.data?.length) {
    console.error("proposal_party_save_failed", { code: result.error?.code });
    const message =
      result.error?.code === "23505"
        ? "Esta proposta já tem um participante com esse papel."
        : result.error
          ? databaseMessage(result.error)
          : "Esta proposta não pode mais ser editada.";
    redirect(proposalUrl(proposal.id, { error: message }));
  }
  revalidateProposal(proposal.id);
  redirect(proposalUrl(proposal.id, { message: "Participante salvo." }));
}

export async function removeProposalParty(formData: FormData) {
  const { organization } = await requireRealEstateWorkspace();
  const parsed = z
    .object({ proposalId: z.uuid(), partyId: z.uuid() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/proposals");
  const proposal = await getProposalRef(organization.id, parsed.data.proposalId);
  const supabase = await createClient();
  const { data: documents } = await supabase
    .from("proposal_documents")
    .select("storage_path")
    .eq("organization_id", organization.id)
    .eq("party_id", parsed.data.partyId)
    .limit(100);
  const { data, error } = await supabase
    .from("proposal_parties")
    .delete()
    .eq("organization_id", organization.id)
    .eq("proposal_id", proposal.id)
    .eq("id", parsed.data.partyId)
    .select("id");
  if (error || !data?.length) {
    redirect(proposalUrl(proposal.id, { error: "Não foi possível remover o participante." }));
  }
  if (documents?.length) {
    await supabase.storage.from("proposal-documents").remove(documents.map((item) => item.storage_path));
  }
  revalidateProposal(proposal.id);
  redirect(proposalUrl(proposal.id, { message: "Participante removido." }));
}

// ---------------------------------------------------------------------------
// Documentos
// ---------------------------------------------------------------------------

/** Confere a assinatura binária do arquivo (não confia só no content-type do navegador). */
function detectDocumentType(bytes: Uint8Array) {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (ascii(0, 5) === "%PDF-") return { mime: "application/pdf", extension: "pdf" } as const;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", extension: "jpg" } as const;
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return { mime: "image/png", extension: "png" } as const;
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { mime: "image/webp", extension: "webp" } as const;
  return null;
}

export async function uploadProposalDocument(formData: FormData) {
  const { user, organization } = await requireRealEstateWorkspace();
  const parsed = z
    .object({
      proposalId: z.uuid(),
      partyId: z.uuid(),
      documentType: z.enum(["identity", "proof_of_residence", "civil_status_certificate", "income_proof", "other"]),
    })
    .safeParse({
      proposalId: formData.get("proposalId"),
      partyId: formData.get("partyId"),
      documentType: formData.get("documentType"),
    });
  const file = formData.get("file");
  if (!parsed.success) redirect("/proposals?error=Dados+do+documento+inválidos.");
  const proposal = await getProposalRef(organization.id, parsed.data.proposalId);
  if (!(file instanceof File) || file.size === 0) {
    redirect(proposalUrl(proposal.id, { error: "Selecione um arquivo." }));
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    redirect(proposalUrl(proposal.id, { error: "Arquivo acima de 4 MB. Envie uma versão menor." }));
  }
  const buffer = new Uint8Array(await file.arrayBuffer());
  const detected = detectDocumentType(buffer);
  if (!detected) {
    redirect(proposalUrl(proposal.id, { error: "Use PDF, JPG, PNG ou WebP." }));
  }

  const supabase = await createClient();
  const path = `organizations/${organization.id}/proposals/${proposal.id}/${crypto.randomUUID()}.${detected.extension}`;
  const { error: uploadError } = await supabase.storage
    .from("proposal-documents")
    .upload(path, buffer, { contentType: detected.mime, upsert: false });
  if (uploadError) {
    console.error("proposal_document_upload_failed", { code: uploadError.message.slice(0, 80) });
    redirect(proposalUrl(proposal.id, { error: "Não foi possível enviar o documento." }));
  }
  const fileName = file.name.replace(/[^\p{L}\p{N}._ -]/gu, "").slice(0, 200) || `documento.${detected.extension}`;
  const { error } = await supabase.from("proposal_documents").insert({
    organization_id: organization.id,
    proposal_id: proposal.id,
    party_id: parsed.data.partyId,
    document_type: parsed.data.documentType,
    storage_path: path,
    file_name: fileName,
    mime_type: detected.mime,
    size_bytes: file.size,
    uploaded_by: user.id,
  });
  if (error) {
    await supabase.storage.from("proposal-documents").remove([path]);
    console.error("proposal_document_record_failed", { code: error.code });
    redirect(proposalUrl(proposal.id, { error: databaseMessage(error) }));
  }
  revalidateProposal(proposal.id);
  redirect(proposalUrl(proposal.id, { message: "Documento enviado." }));
}

export async function removeProposalDocument(formData: FormData) {
  const { organization } = await requireRealEstateWorkspace();
  const parsed = z
    .object({ proposalId: z.uuid(), documentId: z.uuid() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/proposals");
  const proposal = await getProposalRef(organization.id, parsed.data.proposalId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposal_documents")
    .delete()
    .eq("organization_id", organization.id)
    .eq("proposal_id", proposal.id)
    .eq("id", parsed.data.documentId)
    .select("storage_path");
  if (error || !data?.length) {
    redirect(proposalUrl(proposal.id, { error: "Não foi possível remover o documento." }));
  }
  await supabase.storage.from("proposal-documents").remove(data.map((item) => item.storage_path));
  revalidateProposal(proposal.id);
  redirect(proposalUrl(proposal.id, { message: "Documento removido." }));
}

// ---------------------------------------------------------------------------
// Fluxo: enviar, decidir, cancelar
// ---------------------------------------------------------------------------

export async function submitProposal(formData: FormData) {
  const { organization } = await requireRealEstateWorkspace();
  const proposalId = z.uuid().safeParse(formData.get("proposalId"));
  if (!proposalId.success) redirect("/proposals");
  const proposal = await getProposalRef(organization.id, proposalId.data);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_property_proposal", {
    p_organization_id: organization.id,
    p_proposal_id: proposal.id,
  });
  if (error) {
    console.error("property_proposal_submit_failed", { code: error.code });
    redirect(proposalUrl(proposal.id, { error: databaseMessage(error) }));
  }
  const result = z
    .object({
      status: z.string(),
      queue_position: z.number().nullable().optional(),
      missing: z.array(z.string()),
    })
    .safeParse(data);
  if (!result.success) redirect(proposalUrl(proposal.id, { error: "Resposta inesperada ao enviar." }));
  if (result.data.missing.length > 0) {
    redirect(proposalUrl(proposal.id, { error: `Faltam ${result.data.missing.length} itens para enviar a proposta.` }));
  }
  revalidateProposal(proposal.id, proposal.developmentId);
  const message =
    result.data.status === "queued"
      ? `Proposta enviada. A unidade já tinha proposta em análise: você está na posição ${result.data.queue_position} da fila.`
      : "Proposta enviada para análise.";
  redirect(proposalUrl(proposal.id, { message }));
}

const decisionSchema = z
  .object({
    proposalId: z.uuid(),
    decision: z.enum(["approved", "rejected", "countered"]),
    note: nullableText(2000),
    counterOfferPrice: z.preprocess(parseMoney, z.coerce.number().gt(0).max(999_999_999_999).nullable()),
  })
  .refine((data) => data.decision !== "countered" || data.counterOfferPrice !== null, {
    path: ["counterOfferPrice"],
  });

export async function decideProposal(formData: FormData) {
  const { organization } = await requireRealEstateWorkspace();
  if (!["owner", "admin"].includes(organization.role)) {
    redirect("/proposals?error=Apenas+administradores+aprovam+propostas.");
  }
  const parsed = decisionSchema.safeParse({
    proposalId: formData.get("proposalId"),
    decision: formData.get("decision"),
    note: formData.get("note"),
    counterOfferPrice: formData.get("counterOfferPrice") || null,
  });
  const rawId = z.uuid().safeParse(formData.get("proposalId"));
  if (!parsed.success) {
    redirect(rawId.success ? proposalUrl(rawId.data, { error: "Para contraproposta, informe o valor." }) : "/proposals");
  }
  const proposal = await getProposalRef(organization.id, parsed.data.proposalId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_property_proposal", {
    p_organization_id: organization.id,
    p_proposal_id: proposal.id,
    p_decision: parsed.data.decision,
    p_note: parsed.data.note,
    p_counter_offer_price: parsed.data.decision === "countered" ? parsed.data.counterOfferPrice : null,
  });
  if (error) {
    console.error("property_proposal_decision_failed", { code: error.code });
    redirect(proposalUrl(proposal.id, { error: databaseMessage(error) }));
  }
  revalidateProposal(proposal.id, proposal.developmentId);
  const messages = {
    approved: "Proposta aprovada. A unidade foi reservada.",
    rejected: "Proposta recusada. A unidade seguiu para a próxima da fila ou foi liberada.",
    countered: "Contraproposta enviada ao corretor.",
  };
  redirect(proposalUrl(proposal.id, { message: messages[parsed.data.decision] }));
}

export async function cancelProposal(formData: FormData) {
  const { organization } = await requireRealEstateWorkspace();
  const parsed = z
    .object({ proposalId: z.uuid(), reason: nullableText(500) })
    .safeParse({ proposalId: formData.get("proposalId"), reason: formData.get("reason") });
  if (!parsed.success) redirect("/proposals");
  const proposal = await getProposalRef(organization.id, parsed.data.proposalId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_property_proposal", {
    p_organization_id: organization.id,
    p_proposal_id: proposal.id,
    p_reason: parsed.data.reason,
  });
  if (error) {
    console.error("property_proposal_cancel_failed", { code: error.code });
    redirect(proposalUrl(proposal.id, { error: databaseMessage(error) }));
  }
  revalidateProposal(proposal.id, proposal.developmentId);
  redirect(proposalUrl(proposal.id, { message: "Proposta cancelada." }));
}
