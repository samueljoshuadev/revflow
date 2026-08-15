"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { qualifyLeadWithOpenAi } from "@/services/ai/openai";
import { requireWorkspace } from "@/services/workspace";

const moveSchema = z.object({
  leadId: z.uuid(),
  toStageId: z.uuid(),
});

export type MoveLeadResult = { ok: true } | { ok: false; error: string };

export type LeadAiAutomationResult =
  | {
      ok: true;
      leadId: string;
      score: number;
      priority: "low" | "medium" | "high" | "urgent";
      nextAction: string;
      stageAdvanced: boolean;
      toStageId: string | null;
      toStageName: string | null;
    }
  | { ok: false; error: string };

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

export async function runLeadAiAutomation(
  input: unknown,
): Promise<LeadAiAutomationResult> {
  const { organization } = await requireWorkspace();
  const parsed = z.object({ leadId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Lead inválido." };

  try {
    const result = await qualifyLeadWithOpenAi(
      organization.id,
      parsed.data.leadId,
    );
    revalidatePath("/pipeline");
    revalidatePath(`/leads/${parsed.data.leadId}`);
    revalidatePath("/dashboard");
    return {
      ok: true,
      leadId: parsed.data.leadId,
      score: result.analysis.score,
      priority: result.analysis.priority,
      nextAction: result.analysis.next_action,
      stageAdvanced: result.automation.stageAdvanced,
      toStageId: result.automation.toStageId,
      toStageName: result.automation.toStageName,
    };
  } catch (error) {
    const code = error instanceof Error ? error.message : "ai_analysis_failed";
    console.error("pipeline_ai_automation_failed", {
      code: code.slice(0, 100),
    });
    if (code.includes("limit")) {
      return { ok: false, error: "O limite mensal de análises foi atingido." };
    }
    if (
      code.includes("not_connected") ||
      code.includes("missing") ||
      code.includes("worker_not_configured")
    ) {
      return {
        ok: false,
        error:
          "Conecte e teste a OpenAI em Integrações antes de usar a automação.",
      };
    }
    return {
      ok: false,
      error: "A IA não conseguiu analisar agora. O Kanban não foi alterado.",
    };
  }
}
