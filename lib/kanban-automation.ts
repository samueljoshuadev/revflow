import type { LeadAnalysis } from "@/services/ai/schemas";
import type { OrganizationVertical, Tables } from "@/types/database";

export const AI_KANBAN_MINIMUM_SCORE = 60;

type StageCandidate = Pick<
  Tables<"pipeline_stages">,
  "id" | "name" | "slug" | "position" | "is_closed"
>;

export type KanbanAutomationDecision = {
  targetStageId: string;
  targetStageName: string;
  reason: string;
} | null;

export function getKanbanAutomationDecision(input: {
  vertical: OrganizationVertical;
  currentStage: StageCandidate;
  stages: StageCandidate[];
  analysis: LeadAnalysis;
  hasCompleteRealEstateProfile: boolean;
}): KanbanAutomationDecision {
  const {
    vertical,
    currentStage,
    stages,
    analysis,
    hasCompleteRealEstateProfile,
  } = input;

  if (currentStage.is_closed || analysis.score < AI_KANBAN_MINIMUM_SCORE) {
    return null;
  }

  const targetSlug =
    vertical === "agency"
      ? getAgencyTargetSlug(currentStage.slug)
      : getRealEstateTargetSlug(
          currentStage.slug,
          hasCompleteRealEstateProfile,
        );
  if (!targetSlug) return null;

  const target = stages.find((stage) => stage.slug === targetSlug);
  if (!target || target.is_closed || target.position <= currentStage.position) {
    return null;
  }

  return {
    targetStageId: target.id,
    targetStageName: target.name,
    reason:
      vertical === "agency"
        ? `Qualificação validada pela IA com score ${analysis.score}.`
        : `Qualificação validada pela IA e perfil imobiliário completo, com score ${analysis.score}.`,
  };
}

function getAgencyTargetSlug(currentSlug: string) {
  return ["novo-lead", "clicou-no-link", "cadastro-concluido"].includes(
    currentSlug,
  )
    ? "qualificado"
    : null;
}

function getRealEstateTargetSlug(
  currentSlug: string,
  hasCompleteRealEstateProfile: boolean,
) {
  return currentSlug === "novo-lead" && hasCompleteRealEstateProfile
    ? "perfil-identificado"
    : null;
}
