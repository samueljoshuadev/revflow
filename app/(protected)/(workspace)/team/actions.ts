"use server";

import { createHash, randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/services/workspace";

const roleSchema = z.enum(["owner", "admin", "manager", "member", "viewer"]);

function requireAdmin(role: string) {
  if (!["owner", "admin"].includes(role)) {
    redirect("/team?error=Você+não+tem+permissão+para+gerenciar+a+equipe.");
  }
}

export async function createInvitation(formData: FormData) {
  const { user, organization } = await requireWorkspace();
  requireAdmin(organization.role);
  const parsed = z
    .object({ email: z.email().max(254), role: roleSchema })
    .safeParse({
      email: formData.get("email"),
      role: formData.get("role"),
  });
  if (!parsed.success) redirect("/team?error=Revise+o+e-mail+e+a+permissão.");
  if (parsed.data.role === "owner" && organization.role !== "owner") {
    redirect("/team?error=Somente+um+proprietário+pode+convidar+outro+proprietário.");
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const supabase = await createClient();
  await supabase
    .from("organization_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("organization_id", organization.id)
    .ilike("email", parsed.data.email)
    .is("accepted_at", null)
    .is("revoked_at", null);
  const { error } = await supabase.from("organization_invitations").insert({
    organization_id: organization.id,
    email: parsed.data.email.toLowerCase(),
    role: parsed.data.role,
    token_hash: tokenHash,
    invited_by: user.id,
  });
  if (error) {
    console.error("invitation_creation_failed", { code: error.code });
    redirect("/team?error=Não+foi+possível+criar+o+convite.");
  }
  revalidatePath("/team");
  redirect(`/team?invite=${encodeURIComponent(`/invite/${token}`)}`);
}

export async function updateMemberRole(formData: FormData) {
  const { user, organization } = await requireWorkspace();
  requireAdmin(organization.role);
  const parsed = z.object({ userId: z.uuid(), role: roleSchema }).safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return;
  if (parsed.data.userId === user.id) {
    redirect("/team?error=Você+não+pode+alterar+a+própria+permissão.");
  }
  if (parsed.data.role === "owner" && organization.role !== "owner") {
    redirect("/team?error=Somente+um+proprietário+pode+conceder+acesso+de+proprietário.");
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_organization_member_role", {
    p_organization_id: organization.id,
    p_user_id: parsed.data.userId,
    p_role: parsed.data.role,
  });
  if (error)
    redirect(
      `/team?error=${encodeURIComponent(error.message.includes("owner") ? "A organização precisa manter ao menos um proprietário." : "Não foi possível alterar a permissão.")}`,
    );
  revalidatePath("/team");
}

export async function removeMember(formData: FormData) {
  const { user, organization } = await requireWorkspace();
  requireAdmin(organization.role);
  const parsed = z.uuid().safeParse(formData.get("userId"));
  if (!parsed.success || parsed.data === user.id) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_organization_member", {
    p_organization_id: organization.id,
    p_user_id: parsed.data,
  });
  if (error) redirect("/team?error=Não+foi+possível+remover+o+membro.");
  revalidatePath("/team");
}

export async function revokeInvitation(formData: FormData) {
  const { organization } = await requireWorkspace();
  requireAdmin(organization.role);
  const parsed = z.uuid().safeParse(formData.get("invitationId"));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase
    .from("organization_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("organization_id", organization.id)
    .eq("id", parsed.data);
  revalidatePath("/team");
}
