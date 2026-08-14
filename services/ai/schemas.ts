import { z } from "zod";

export const leadAnalysisSchema = z
  .object({
    score: z.number().int().min(0).max(100),
    priority: z.enum(["low", "medium", "high", "urgent"]),
    temperature: z.enum(["cold", "warm", "hot"]),
    service: z.string().trim().min(1).max(100),
    estimated_value: z.number().nonnegative().max(999_999_999).nullable(),
    intent: z.string().trim().min(1).max(500),
    urgency: z.enum(["low", "medium", "high"]),
    budget_fit: z.enum(["unknown", "below", "compatible", "above"]),
    summary: z.string().trim().min(1).max(2000),
    next_action: z.string().trim().min(1).max(500),
    reason: z.string().trim().min(1).max(1000),
  })
  .strict();

export type LeadAnalysis = z.infer<typeof leadAnalysisSchema>;

export const LEAD_ANALYSIS_SCHEMA_VERSION = "2026-08-14";
