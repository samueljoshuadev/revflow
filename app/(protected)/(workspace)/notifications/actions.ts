"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/services/workspace";

export async function markNotificationRead(formData: FormData) {
  const { user, organization } = await requireWorkspace();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id.data)
    .eq("organization_id", organization.id)
    .eq("user_id", user.id);
  if (error) console.error("notification_read_failed", { code: error.code });
  revalidatePath("/notifications");
}
