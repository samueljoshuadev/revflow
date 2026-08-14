import "server-only";

import {
  LEAD_ANALYSIS_SCHEMA_VERSION,
  leadAnalysisSchema,
  type LeadAnalysis,
} from "@/services/ai/schemas";

export type LeadAnalysisInput = {
  name: string;
  company: string | null;
  serviceInterest: string | null;
  budget: number | null;
  source: string | null;
  notes: string[];
};

export interface LeadAnalysisProvider {
  analyze(input: LeadAnalysisInput, schemaVersion: string): Promise<unknown>;
}

/**
 * Provider-neutral boundary. A future OpenAI adapter belongs beside this file;
 * prompts and SDK calls must not leak into React components or route handlers.
 */
export async function analyzeLead(
  provider: LeadAnalysisProvider,
  input: LeadAnalysisInput,
): Promise<LeadAnalysis> {
  const rawResult = await provider.analyze(input, LEAD_ANALYSIS_SCHEMA_VERSION);
  return leadAnalysisSchema.parse(rawResult);
}
