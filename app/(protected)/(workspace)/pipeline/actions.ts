"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/services/workspace";

const moveSchema = z.object({
  leadId: z.uuid(),
  toStageId: z.uuid(),
});

export type MoveLeadResult = { ok: true } | { ok: false; error: string };

export async function moveLeadStage(input: unknown): Promise<MoveLeadResult> {
  await requireWorkspace();
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Movimentação inválida." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("move_lead_stage", {
    p_lead_id: parsed.data.leadId,
    p_to_stage_id: parsed.data.toStageId,
  });

  if (error) {
    console.error("lead_stage_move_failed", { code: error.code });
    return { ok: false, error: "Não foi possível mover o lead." };
  }

  revalidatePath("/pipeline");
  revalidatePath(`/leads/${parsed.data.leadId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
