"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
});

function messageUrl(kind: "error" | "message", message: string) {
  return `/login?${new URLSearchParams({ [kind]: message }).toString()}`;
}

export async function signIn(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success)
    redirect(messageUrl("error", "Revise seu e-mail e senha."));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect(messageUrl("error", "E-mail ou senha inválidos."));

  const next = formData.get("next");
  const safeNext =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/dashboard";
  redirect(safeNext);
}

export async function signUp(formData: FormData) {
  const parsed = credentialsSchema
    .extend({ fullName: z.string().trim().min(2).max(100) })
    .safeParse({
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

  if (!parsed.success)
    redirect(messageUrl("error", "Preencha os campos corretamente."));

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) redirect(messageUrl("error", "Não foi possível criar a conta."));
  if (data.session) redirect("/onboarding");
  redirect(messageUrl("message", "Confira seu e-mail para confirmar a conta."));
}

export async function requestPasswordReset(formData: FormData) {
  const email = z.email().max(254).safeParse(formData.get("email"));
  if (!email.success)
    redirect(messageUrl("error", "Informe um e-mail válido."));
  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${appUrl}/auth/callback?next=/auth/update-password`,
  });
  if (error) {
    console.error("password_reset_request_failed", { code: error.code });
  }
  redirect(
    messageUrl(
      "message",
      "Se houver uma conta para este e-mail, você receberá as instruções.",
    ),
  );
}
