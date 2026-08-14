"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/services/workspace";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().max(max).nullable(),
  );

export async function createCustomer(formData: FormData) {
  const { user, organization } = await requireWorkspace();
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(160),
      company: optionalText(160),
      email: z.preprocess(
        (value) => (value === "" ? null : value),
        z.email().max(254).nullable(),
      ),
      phone: optionalText(40),
      document: optionalText(40),
    })
    .safeParse({
      name: formData.get("name"),
      company: formData.get("company"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      document: formData.get("document"),
    });
  if (!parsed.success) redirect("/clients?error=Revise+os+dados+do+cliente.");
  const supabase = await createClient();
  const { error } = await supabase.from("clients").insert({
    organization_id: organization.id,
    owner_id: user.id,
    created_by: user.id,
    ...parsed.data,
  });
  if (error) redirect("/clients?error=Não+foi+possível+criar+o+cliente.");
  revalidatePath("/clients");
  redirect("/clients?message=Cliente+criado.");
}

export async function createProposal(formData: FormData) {
  const { user, organization } = await requireWorkspace();
  const parsed = z
    .object({
      clientId: z.uuid(),
      title: z.string().trim().min(2).max(180),
      total: z.coerce.number().min(0).max(999_999_999),
      validUntil: z.preprocess(
        (value) => (value === "" ? null : value),
        z.iso.date().nullable(),
      ),
    })
    .safeParse({
      clientId: formData.get("clientId"),
      title: formData.get("title"),
      total: formData.get("total"),
      validUntil: formData.get("validUntil"),
    });
  if (!parsed.success) redirect("/clients?error=Revise+os+dados+da+proposta.");
  const supabase = await createClient();
  const { error } = await supabase.from("proposals").insert({
    organization_id: organization.id,
    client_id: parsed.data.clientId,
    owner_id: user.id,
    created_by: user.id,
    title: parsed.data.title,
    subtotal: parsed.data.total,
    total: parsed.data.total,
    valid_until: parsed.data.validUntil,
  });
  if (error) redirect("/clients?error=Não+foi+possível+criar+a+proposta.");
  revalidatePath("/clients");
  redirect("/clients?message=Proposta+criada+como+rascunho.");
}

export async function createProject(formData: FormData) {
  const { user, organization } = await requireWorkspace();
  const parsed = z
    .object({
      clientId: z.uuid(),
      name: z.string().trim().min(2).max(180),
      dueOn: z.preprocess(
        (value) => (value === "" ? null : value),
        z.iso.date().nullable(),
      ),
    })
    .safeParse({
      clientId: formData.get("clientId"),
      name: formData.get("name"),
      dueOn: formData.get("dueOn"),
    });
  if (!parsed.success) redirect("/clients?error=Revise+os+dados+do+projeto.");
  const supabase = await createClient();
  const { error } = await supabase.from("projects").insert({
    organization_id: organization.id,
    client_id: parsed.data.clientId,
    owner_id: user.id,
    created_by: user.id,
    name: parsed.data.name,
    due_on: parsed.data.dueOn,
  });
  if (error) redirect("/clients?error=Não+foi+possível+criar+o+projeto.");
  revalidatePath("/clients");
  redirect("/clients?message=Projeto+criado.");
}
