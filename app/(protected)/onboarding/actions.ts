"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth";

const organizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  vertical: z.enum(["agency", "real_estate"]),
});

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function createOrganization(formData: FormData) {
  await requireUser();
  const parsed = organizationSchema.safeParse({
    name: formData.get("name"),
    vertical: formData.get("vertical"),
  });
  if (!parsed.success) redirect("/onboarding?error=Informe+um+nome+válido.");

  const supabase = await createClient();
  const uniqueSuffix = crypto.randomUUID().slice(0, 6);
  const slug = `${slugify(parsed.data.name) || (parsed.data.vertical === "real_estate" ? "imobiliaria" : "agencia")}-${uniqueSuffix}`;
  const { error } = await supabase.rpc("create_organization_with_vertical", {
    p_name: parsed.data.name,
    p_slug: slug,
    p_vertical: parsed.data.vertical,
  });

  if (error) {
    console.error("organization_creation_failed", { code: error.code });
    redirect("/onboarding?error=Não+foi+possível+criar+a+organização.");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
