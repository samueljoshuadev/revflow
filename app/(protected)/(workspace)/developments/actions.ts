"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { requireRealEstateWorkspace } from "@/services/workspace";

const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024;
const MAX_UNITS = 5000;

const nullableNumber = z.number().min(0).max(999_999_999_999).nullable().optional();
const nullablePercent = z.number().min(0).max(100).nullable().optional();
const nullableCount = z.number().int().min(0).max(600).nullable().optional();

const unitSchema = z.object({
  code: z.string().trim().min(1).max(60),
  title: z.string().trim().min(2).max(180).nullable().optional(),
  status: z.enum(["available", "reserved", "sold", "inactive"]).default("available"),
  property_type: z
    .enum(["apartment", "house", "commercial", "land", "rural", "other"])
    .nullable()
    .optional(),
  city: z.string().trim().min(2).max(120).nullable().optional(),
  neighborhood: z.string().trim().max(120).nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  area_m2: nullableNumber,
  land_area_m2: nullableNumber,
  unit_floor: z.number().int().min(0).max(300).nullable().optional(),
  bedrooms: z.number().int().min(0).max(100).nullable().optional(),
  bathrooms: z.number().int().min(0).max(100).nullable().optional(),
  parking_spaces: z.number().int().min(0).max(100).nullable().optional(),
  list_price: nullableNumber,
  price_per_m2: nullableNumber,
  down_payment: nullableNumber,
  down_payment_percent: nullablePercent,
  monthly_installment: nullableNumber,
  monthly_installment_count: nullableCount,
  annual_installment: nullableNumber,
  annual_installment_count: z.number().int().min(0).max(100).nullable().optional(),
  keys_payment: nullableNumber,
  financing_amount: nullableNumber,
  financing_percent: nullablePercent,
});

const salesTableSchema = z.object({
  source_reference: z.string().trim().min(1).max(180).nullable().optional(),
  units: z.array(unitSchema).min(1).max(MAX_UNITS),
});

function fail(slug: string, message: string): never {
  redirect(`/developments/${slug}?error=${encodeURIComponent(message)}`);
}

export async function importSalesTable(formData: FormData) {
  const { organization } = await requireRealEstateWorkspace();
  const slug = z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .safeParse(formData.get("slug"));
  if (!slug.success) redirect("/developments?error=Empreendimento+inv%C3%A1lido.");

  const file = formData.get("salesTable");
  if (!(file instanceof File) || file.size === 0) {
    fail(slug.data, "Envie o arquivo JSON do espelho de vendas.");
  }
  if (file.size > MAX_PAYLOAD_BYTES) {
    fail(slug.data, "Arquivo acima de 2 MB.");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    fail(slug.data, "Arquivo não é um JSON válido.");
  }

  const parsed = salesTableSchema.safeParse(payload);
  if (!parsed.success) {
    fail(slug.data, "Espelho fora do formato esperado. Revise os campos das unidades.");
  }

  const supabase = await createClient();
  // O slug vindo do formulário nunca é confiado: o empreendimento é resolvido
  // dentro da organização ativa, e a RLS continua sendo a última barreira.
  const { data: development, error: developmentError } = await supabase
    .from("developments")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("slug", slug.data)
    .is("archived_at", null)
    .maybeSingle();
  if (developmentError || !development) {
    fail(slug.data, "Empreendimento não encontrado nesta conta.");
  }

  const { data, error } = await supabase.rpc("import_sales_table", {
    p_organization_id: organization.id,
    p_development_id: development.id,
    p_units: parsed.data.units,
    p_source_reference: parsed.data.source_reference ?? null,
  });
  if (error) {
    console.error("sales_table_import_failed", { code: error.code });
    fail(slug.data, "Não foi possível importar o espelho de vendas.");
  }

  const result = (data ?? {}) as {
    created?: number;
    updated?: number;
    without_price?: number;
  };
  revalidatePath("/developments");
  revalidatePath(`/developments/${slug.data}`);
  revalidatePath("/properties");
  revalidatePath("/dashboard");
  redirect(
    `/developments/${slug.data}?message=${encodeURIComponent(
      `Espelho importado: ${result.created ?? 0} criadas, ${result.updated ?? 0} atualizadas, ${result.without_price ?? 0} sem valor na tabela.`,
    )}`,
  );
}
