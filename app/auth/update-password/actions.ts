"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

export async function updatePassword(formData: FormData) {
  const parsed = z
    .object({
      password: z.string().min(8).max(128),
      confirmation: z.string().min(8).max(128),
    })
    .safeParse({
      password: formData.get("password"),
      confirmation: formData.get("confirmation"),
    });
  if (!parsed.success || parsed.data.password !== parsed.data.confirmation) {
    redirect(
      "/auth/update-password?error=As+senhas+não+coincidem+ou+são+inválidas.",
    );
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error)
    redirect(
      "/auth/update-password?error=O+link+expirou+ou+a+senha+não+foi+aceita.",
    );
  redirect("/dashboard");
}
