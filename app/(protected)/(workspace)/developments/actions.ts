"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { manualUnitStatuses } from "@/lib/developments";
import { createClient } from "@/lib/supabase/server";
import { requireRealEstateAdmin } from "@/services/workspace";

const MAX_GENERATED_UNITS = 2000;

const emptyToNull = (value: unknown) =>
  value === "" || value === null || value === undefined ? null : value;

const nullableNumber = (schema: z.ZodNumber) =>
  z.preprocess(emptyToNull, z.coerce.number().pipe(schema).nullable());

const nullableText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable());

/** Aceita "450.000,00" e "450000.00". */
const money = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const normalized = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value;
  return normalized.trim();
}, z.coerce.number().min(0).max(999_999_999_999));

const developmentSchema = z.object({
  developmentId: z.uuid().optional(),
  name: z.string().trim().min(2).max(180),
  developerName: z.preprocess(emptyToNull, z.string().trim().min(2).max(180).nullable()),
  stage: z.enum(["pre_launch", "launch", "under_construction", "ready"]),
  city: z.string().trim().min(2).max(120),
  neighborhood: nullableText(120),
  address: nullableText(300),
  deliveryDate: z.preprocess(emptyToNull, z.iso.date().nullable()),
  description: nullableText(5000),
  financingAnnualRate: nullableNumber(z.number().min(0).max(60)),
  financingMaxTermMonths: nullableNumber(z.number().int().min(1).max(480)),
  financingMaxLtv: nullableNumber(z.number().min(1).max(100)),
  incomeCommitmentLimit: z.coerce.number().min(1).max(100),
});

function parseDevelopment(formData: FormData) {
  return developmentSchema.safeParse({
    developmentId: formData.get("developmentId") || undefined,
    name: formData.get("name"),
    developerName: formData.get("developerName"),
    stage: formData.get("stage"),
    city: formData.get("city"),
    neighborhood: formData.get("neighborhood"),
    address: formData.get("address"),
    deliveryDate: formData.get("deliveryDate"),
    description: formData.get("description"),
    financingAnnualRate: formData.get("financingAnnualRate"),
    financingMaxTermMonths: formData.get("financingMaxTermMonths"),
    financingMaxLtv: formData.get("financingMaxLtv"),
    incomeCommitmentLimit: formData.get("incomeCommitmentLimit") || 30,
  });
}

function toDevelopmentWrite(data: z.infer<typeof developmentSchema>) {
  return {
    name: data.name,
    developer_name: data.developerName,
    stage: data.stage,
    city: data.city,
    neighborhood: data.neighborhood,
    address: data.address,
    delivery_date: data.deliveryDate,
    description: data.description,
    financing_annual_rate: data.financingAnnualRate,
    financing_max_term_months: data.financingMaxTermMonths,
    financing_max_ltv: data.financingMaxLtv,
    income_commitment_limit: data.incomeCommitmentLimit,
  };
}

/** Confirma que o empreendimento pertence à organização ativa (não confia no ID do form). */
async function assertDevelopment(organizationId: string, developmentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("developments")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("id", developmentId)
    .is("archived_at", null)
    .maybeSingle();
  if (error || !data) redirect("/developments?error=Empreendimento+inválido.");
  return data.id;
}

async function assertTower(organizationId: string, developmentId: string, towerId: string | null) {
  if (!towerId) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("development_towers")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("development_id", developmentId)
    .eq("id", towerId)
    .maybeSingle();
  if (error || !data) {
    redirect(`/developments/${developmentId}/settings?error=Bloco+inválido.`);
  }
  return data.id;
}

function revalidateDevelopment(developmentId: string) {
  revalidatePath("/developments");
  revalidatePath(`/developments/${developmentId}`);
  revalidatePath(`/developments/${developmentId}/settings`);
}

export async function createDevelopment(formData: FormData) {
  const { user, organization } = await requireRealEstateAdmin();
  const parsed = parseDevelopment(formData);
  if (!parsed.success) {
    redirect("/developments/new?error=Revise+os+dados+do+empreendimento.");
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("developments")
    .insert({
      organization_id: organization.id,
      created_by: user.id,
      ...toDevelopmentWrite(parsed.data),
    })
    .select("id")
    .single();
  if (error) {
    console.error("development_creation_failed", { code: error.code });
    redirect("/developments/new?error=Não+foi+possível+cadastrar+o+empreendimento.");
  }
  revalidatePath("/developments");
  redirect(`/developments/${data.id}/settings?message=Empreendimento+criado.+Agora+cadastre+os+blocos+e+unidades.`);
}

export async function updateDevelopment(formData: FormData) {
  const { organization } = await requireRealEstateAdmin();
  const parsed = parseDevelopment(formData);
  if (!parsed.success || !parsed.data.developmentId) {
    const id = z.uuid().safeParse(formData.get("developmentId"));
    redirect(
      id.success
        ? `/developments/${id.data}/settings?error=Revise+os+dados+do+empreendimento.`
        : "/developments?error=Dados+inválidos.",
    );
  }
  const developmentId = await assertDevelopment(organization.id, parsed.data.developmentId);
  const supabase = await createClient();
  const { error } = await supabase
    .from("developments")
    .update(toDevelopmentWrite(parsed.data))
    .eq("organization_id", organization.id)
    .eq("id", developmentId);
  if (error) {
    console.error("development_update_failed", { code: error.code });
    redirect(`/developments/${developmentId}/settings?error=Não+foi+possível+salvar.`);
  }
  revalidateDevelopment(developmentId);
  redirect(`/developments/${developmentId}/settings?message=Empreendimento+atualizado.`);
}

export async function archiveDevelopment(formData: FormData) {
  const { organization } = await requireRealEstateAdmin();
  const id = z.uuid().safeParse(formData.get("developmentId"));
  if (!id.success) redirect("/developments?error=Dados+inválidos.");
  const developmentId = await assertDevelopment(organization.id, id.data);
  const supabase = await createClient();
  const { error } = await supabase
    .from("developments")
    .update({ archived_at: new Date().toISOString() })
    .eq("organization_id", organization.id)
    .eq("id", developmentId);
  if (error) {
    console.error("development_archive_failed", { code: error.code });
    redirect(`/developments/${developmentId}/settings?error=Não+foi+possível+arquivar.`);
  }
  revalidatePath("/developments");
  redirect("/developments?message=Empreendimento+arquivado.");
}

const towerSchema = z.object({
  developmentId: z.uuid(),
  name: z.string().trim().min(1).max(80),
});

export async function createTower(formData: FormData) {
  const { user, organization } = await requireRealEstateAdmin();
  const parsed = towerSchema.safeParse({
    developmentId: formData.get("developmentId"),
    name: formData.get("name"),
  });
  if (!parsed.success) redirect("/developments?error=Dados+do+bloco+inválidos.");
  const developmentId = await assertDevelopment(organization.id, parsed.data.developmentId);
  const supabase = await createClient();
  const { count } = await supabase
    .from("development_towers")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organization.id)
    .eq("development_id", developmentId);
  const { error } = await supabase.from("development_towers").insert({
    organization_id: organization.id,
    development_id: developmentId,
    name: parsed.data.name,
    position: count ?? 0,
    created_by: user.id,
  });
  if (error) {
    console.error("development_tower_creation_failed", { code: error.code });
    const message = error.code === "23505" ? "Já+existe+um+bloco+com+esse+nome." : "Não+foi+possível+criar+o+bloco.";
    redirect(`/developments/${developmentId}/settings?error=${message}`);
  }
  revalidateDevelopment(developmentId);
  redirect(`/developments/${developmentId}/settings?message=Bloco+criado.`);
}

const generateSchema = z
  .object({
    developmentId: z.uuid(),
    towerId: z.preprocess(emptyToNull, z.uuid().nullable()),
    floorFrom: z.coerce.number().int().min(-10).max(300),
    floorTo: z.coerce.number().int().min(-10).max(300),
    unitsPerFloor: z.coerce.number().int().min(1).max(99),
    listPrice: money,
    typology: nullableText(80),
    bedrooms: nullableNumber(z.number().int().min(0).max(50)),
    areaM2: nullableNumber(z.number().gt(0).max(1_000_000)),
    parkingSpaces: nullableNumber(z.number().int().min(0).max(50)),
  })
  .refine((data) => data.floorTo >= data.floorFrom, { path: ["floorTo"] })
  .refine(
    (data) => (data.floorTo - data.floorFrom + 1) * data.unitsPerFloor <= MAX_GENERATED_UNITS,
    { path: ["unitsPerFloor"] },
  );

/** Gera a grade padrão de prédio: andar 1 com 4 unidades → 101, 102, 103, 104. */
export async function generateUnits(formData: FormData) {
  const { user, organization } = await requireRealEstateAdmin();
  const parsed = generateSchema.safeParse({
    developmentId: formData.get("developmentId"),
    towerId: formData.get("towerId"),
    floorFrom: formData.get("floorFrom"),
    floorTo: formData.get("floorTo"),
    unitsPerFloor: formData.get("unitsPerFloor"),
    listPrice: formData.get("listPrice"),
    typology: formData.get("typology"),
    bedrooms: formData.get("bedrooms"),
    areaM2: formData.get("areaM2"),
    parkingSpaces: formData.get("parkingSpaces"),
  });
  const rawId = z.uuid().safeParse(formData.get("developmentId"));
  if (!parsed.success) {
    redirect(
      rawId.success
        ? `/developments/${rawId.data}/settings?error=Revise+andares,+unidades+por+andar+(máx.+${MAX_GENERATED_UNITS}+no+total)+e+preço.`
        : "/developments?error=Dados+inválidos.",
    );
  }
  const developmentId = await assertDevelopment(organization.id, parsed.data.developmentId);
  const towerId = await assertTower(organization.id, developmentId, parsed.data.towerId);

  const rows = [];
  for (let floor = parsed.data.floorFrom; floor <= parsed.data.floorTo; floor += 1) {
    for (let index = 1; index <= parsed.data.unitsPerFloor; index += 1) {
      const suffix = String(index).padStart(2, "0");
      // Térreo = T01, subsolo -1 = S101, andar 12 = 1201.
      const code =
        floor === 0 ? `T${suffix}` : floor < 0 ? `S${-floor}${suffix}` : `${floor}${suffix}`;
      rows.push({
        organization_id: organization.id,
        development_id: developmentId,
        tower_id: towerId,
        code,
        floor,
        position: index,
        typology: parsed.data.typology,
        bedrooms: parsed.data.bedrooms,
        area_m2: parsed.data.areaM2,
        parking_spaces: parsed.data.parkingSpaces,
        list_price: parsed.data.listPrice,
        created_by: user.id,
      });
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("development_units")
    .upsert(rows, {
      onConflict: "development_id,tower_id,code",
      ignoreDuplicates: true,
    })
    .select("id");
  if (error) {
    console.error("development_units_generation_failed", { code: error.code });
    redirect(`/developments/${developmentId}/settings?error=Não+foi+possível+gerar+as+unidades.`);
  }
  const created = data?.length ?? 0;
  const skipped = rows.length - created;
  revalidateDevelopment(developmentId);
  redirect(
    `/developments/${developmentId}/settings?message=${created}+unidades+criadas${skipped ? `,+${skipped}+já+existiam` : ""}.`,
  );
}

const unitSchema = z.object({
  developmentId: z.uuid(),
  unitId: z.uuid().optional(),
  towerId: z.preprocess(emptyToNull, z.uuid().nullable()),
  code: z.string().trim().min(1).max(30),
  floor: nullableNumber(z.number().int().min(-10).max(300)),
  position: z.preprocess(
    (value) => (value === "" || value === null ? 0 : value),
    z.coerce.number().int().min(0).max(999),
  ),
  typology: nullableText(80),
  bedrooms: nullableNumber(z.number().int().min(0).max(50)),
  areaM2: nullableNumber(z.number().gt(0).max(1_000_000)),
  parkingSpaces: nullableNumber(z.number().int().min(0).max(50)),
  listPrice: money,
  notes: nullableText(1000),
});

function parseUnit(formData: FormData) {
  return unitSchema.safeParse({
    developmentId: formData.get("developmentId"),
    unitId: formData.get("unitId") || undefined,
    towerId: formData.get("towerId"),
    code: formData.get("code"),
    floor: formData.get("floor"),
    position: formData.get("position"),
    typology: formData.get("typology"),
    bedrooms: formData.get("bedrooms"),
    areaM2: formData.get("areaM2"),
    parkingSpaces: formData.get("parkingSpaces"),
    listPrice: formData.get("listPrice"),
    notes: formData.get("notes"),
  });
}

export async function createUnit(formData: FormData) {
  const { user, organization } = await requireRealEstateAdmin();
  const parsed = parseUnit(formData);
  const rawId = z.uuid().safeParse(formData.get("developmentId"));
  if (!parsed.success) {
    redirect(
      rawId.success
        ? `/developments/${rawId.data}/settings?error=Revise+os+dados+da+unidade.`
        : "/developments?error=Dados+inválidos.",
    );
  }
  const developmentId = await assertDevelopment(organization.id, parsed.data.developmentId);
  const towerId = await assertTower(organization.id, developmentId, parsed.data.towerId);
  const supabase = await createClient();
  const { error } = await supabase.from("development_units").insert({
    organization_id: organization.id,
    development_id: developmentId,
    tower_id: towerId,
    code: parsed.data.code,
    floor: parsed.data.floor,
    position: parsed.data.position,
    typology: parsed.data.typology,
    bedrooms: parsed.data.bedrooms,
    area_m2: parsed.data.areaM2,
    parking_spaces: parsed.data.parkingSpaces,
    list_price: parsed.data.listPrice,
    notes: parsed.data.notes,
    created_by: user.id,
  });
  if (error) {
    console.error("development_unit_creation_failed", { code: error.code });
    const message = error.code === "23505" ? "Essa+unidade+já+existe+neste+bloco." : "Não+foi+possível+criar+a+unidade.";
    redirect(`/developments/${developmentId}/settings?error=${message}`);
  }
  revalidateDevelopment(developmentId);
  redirect(`/developments/${developmentId}/settings?message=Unidade+${encodeURIComponent(parsed.data.code)}+criada.`);
}

const unitUpdateSchema = z.object({
  developmentId: z.uuid(),
  unitId: z.uuid(),
  // `in_proposal` só é aceito para manter o status de uma unidade já travada.
  status: z.enum([...manualUnitStatuses, "in_proposal"]),
  listPrice: money,
  typology: nullableText(80),
  notes: nullableText(1000),
});

/** Admin ajusta status (vendida, alugada, reservada…), preço, tipologia e observações. */
export async function updateUnit(formData: FormData) {
  const { organization } = await requireRealEstateAdmin();
  const parsed = unitUpdateSchema.safeParse({
    developmentId: formData.get("developmentId"),
    unitId: formData.get("unitId"),
    status: formData.get("status"),
    listPrice: formData.get("listPrice"),
    typology: formData.get("typology"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) redirect("/developments?error=Dados+da+unidade+inválidos.");
  const developmentId = await assertDevelopment(organization.id, parsed.data.developmentId);
  const supabase = await createClient();
  const { data: current, error: currentError } = await supabase
    .from("development_units")
    .select("id, status")
    .eq("organization_id", organization.id)
    .eq("development_id", developmentId)
    .eq("id", parsed.data.unitId)
    .maybeSingle();
  if (currentError || !current) {
    redirect(`/developments/${developmentId}?error=Unidade+inválida.`);
  }
  const unitUrl = `/developments/${developmentId}?unit=${current.id}`;
  // Unidade travada por proposta só muda de status pelo fluxo de propostas,
  // e nenhuma unidade entra em proposta manualmente.
  const locked = current.status === "in_proposal";
  if (locked !== (parsed.data.status === "in_proposal")) {
    redirect(
      locked
        ? `${unitUrl}&error=Esta+unidade+está+em+proposta+e+o+status+não+pode+ser+alterado+manualmente.`
        : `${unitUrl}&error=O+status+Em+proposta+é+definido+pelo+fluxo+de+propostas.`,
    );
  }
  const { error } = await supabase
    .from("development_units")
    .update({
      status: parsed.data.status,
      list_price: parsed.data.listPrice,
      typology: parsed.data.typology,
      notes: parsed.data.notes,
    })
    .eq("organization_id", organization.id)
    .eq("id", current.id);
  if (error) {
    console.error("development_unit_update_failed", { code: error.code });
    redirect(`${unitUrl}&error=Não+foi+possível+salvar+a+unidade.`);
  }
  revalidateDevelopment(developmentId);
  redirect(`${unitUrl}&message=Unidade+atualizada.`);
}
