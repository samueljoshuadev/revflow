"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth";
import { ACTIVE_ORGANIZATION_COOKIE } from "@/services/organizations";

export async function acceptInvitation(formData: FormData) {
  await requireUser();
  const token = z.string().min(32).max(200).safeParse(formData.get("token"));
  if (!token.success) redirect("/dashboard");
  const supabase = await createClient();
  const { data: organizationId, error } = await supabase.rpc(
    "accept_organization_invitation",
    { p_token: token.data },
  );
  if (error)
    redirect(
      `/invite/${encodeURIComponent(token.data)}?error=${encodeURIComponent("Convite inválido, expirado ou vinculado a outro e-mail.")}`,
    );
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORGANIZATION_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 31_536_000,
  });
  redirect("/dashboard");
}
