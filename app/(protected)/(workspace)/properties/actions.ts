"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { requireRealEstateWorkspace } from "@/services/workspace";

const nullableNumber = (schema: z.ZodNumber) =>
  z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.coerce.number().pipe(schema).nullable(),
  );

const nullableText = (max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.string().trim().max(max).nullable(),
  );

const propertySchema = z.object({
  propertyId: z.uuid().optional(),
  code: z.string().trim().min(1).max(60),
  title: z.string().trim().min(2).max(180),
  status: z.enum(["available", "reserved", "sold", "inactive"]),
  propertyType: z.enum(["apartment", "house", "commercial", "land", "rural", "other"]),
  purpose: z.enum(["sale", "rent"]),
  price: z.coerce.number().min(0).max(999_999_999_999),
  city: z.string().trim().min(2).max(120),
  neighborhood: nullableText(120),
  areaM2: nullableNumber(z.number().min(0).max(10_000_000)),
  bedrooms: nullableNumber(z.number().int().min(0).max(100)),
  bathrooms: nullableNumber(z.number().int().min(0).max(100)),
  parkingSpaces: nullableNumber(z.number().int().min(0).max(100)),
  description: nullableText(5000),
  responsibleUserId: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.uuid().nullable(),
  ),
  features: z.string().max(2000),
});

function parsePropertyForm(formData: FormData) {
  return propertySchema.safeParse({
    propertyId: formData.get("propertyId") || undefined,
    code: formData.get("code"),
    title: formData.get("title"),
    status: formData.get("status"),
    propertyType: formData.get("propertyType"),
    purpose: formData.get("purpose"),
    price: formData.get("price"),
    city: formData.get("city"),
    neighborhood: formData.get("neighborhood"),
    areaM2: formData.get("areaM2"),
    bedrooms: formData.get("bedrooms"),
    bathrooms: formData.get("bathrooms"),
    parkingSpaces: formData.get("parkingSpaces"),
    description: formData.get("description"),
    responsibleUserId: formData.get("responsibleUserId"),
    features: formData.get("features") ?? "",
  });
}

function toPropertyWrite(data: z.infer<typeof propertySchema>) {
  return {
    code: data.code,
    title: data.title,
    status: data.status,
    property_type: data.propertyType,
    purpose: data.purpose,
    price: data.price,
    city: data.city,
    neighborhood: data.neighborhood,
    area_m2: data.areaM2,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    parking_spaces: data.parkingSpaces,
    description: data.description,
    responsible_user_id: data.responsibleUserId,
    features: [...new Set(data.features.split(",").map((item) => item.trim()).filter(Boolean))].slice(0, 50),
  };
}

export async function createProperty(formData: FormData) {
  const { user, organization } = await requireRealEstateWorkspace();
  const parsed = parsePropertyForm(formData);
  if (!parsed.success) redirect("/properties/new?error=Revise+os+dados+do+imóvel.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .insert({
      organization_id: organization.id,
      created_by: user.id,
      ...toPropertyWrite(parsed.data),
    })
    .select("id")
    .single();
  if (error) {
    console.error("property_creation_failed", { code: error.code });
    const message = error.code === "23505" ? "Este+código+de+imóvel+já+existe." : "Não+foi+possível+cadastrar+o+imóvel.";
    redirect(`/properties/new?error=${message}`);
  }
  revalidatePath("/properties");
  revalidatePath("/dashboard");
  redirect(`/properties/${data.id}?message=Imóvel+cadastrado.`);
}

export async function updateProperty(formData: FormData) {
  const { organization } = await requireRealEstateWorkspace();
  const parsed = parsePropertyForm(formData);
  if (!parsed.success || !parsed.data.propertyId) {
    redirect("/properties?error=Dados+inválidos.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("properties")
    .update(toPropertyWrite(parsed.data))
    .eq("organization_id", organization.id)
    .eq("id", parsed.data.propertyId);
  if (error) {
    console.error("property_update_failed", { code: error.code });
    redirect(`/properties/${parsed.data.propertyId}?error=Não+foi+possível+salvar+o+imóvel.`);
  }
  revalidatePath("/properties");
  revalidatePath(`/properties/${parsed.data.propertyId}`);
  revalidatePath("/dashboard");
  redirect(`/properties/${parsed.data.propertyId}?message=Imóvel+atualizado.`);
}

export async function archiveProperty(formData: FormData) {
  const { organization } = await requireRealEstateWorkspace();
  const propertyId = z.uuid().safeParse(formData.get("propertyId"));
  if (!propertyId.success) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("properties")
    .update({ archived_at: new Date().toISOString() })
    .eq("organization_id", organization.id)
    .eq("id", propertyId.data);
  if (error) console.error("property_archive_failed", { code: error.code });
  revalidatePath("/properties");
  redirect("/properties");
}

export async function uploadPropertyPhoto(formData: FormData) {
  const { user, organization } = await requireRealEstateWorkspace();
  const propertyId = z.uuid().safeParse(formData.get("propertyId"));
  const file = formData.get("photo");
  if (!propertyId.success || !(file instanceof File) || file.size === 0) return;
  const allowedTypes = new Map([
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ]);
  const extension = allowedTypes.get(file.type);
  if (!extension || file.size > 5 * 1024 * 1024) {
    redirect(`/properties/${propertyId.data}?error=Use+JPG,+PNG+ou+WebP+de+até+5MB.`);
  }
  const supabase = await createClient();
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("id", propertyId.data)
    .maybeSingle();
  if (propertyError || !property) redirect("/properties?error=Imóvel+inválido.");

  const path = `organizations/${organization.id}/properties/${property.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("property-photos")
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error("property_photo_upload_failed", { code: uploadError.message.slice(0, 80) });
    redirect(`/properties/${property.id}?error=Não+foi+possível+enviar+a+foto.`);
  }
  const { error: photoError } = await supabase.from("property_photos").insert({
    organization_id: organization.id,
    property_id: property.id,
    storage_path: path,
    created_by: user.id,
  });
  if (photoError) {
    await supabase.storage.from("property-photos").remove([path]);
    console.error("property_photo_record_failed", { code: photoError.code });
    redirect(`/properties/${property.id}?error=Não+foi+possível+registrar+a+foto.`);
  }
  revalidatePath(`/properties/${property.id}`);
  redirect(`/properties/${property.id}?message=Foto+adicionada.`);
}

