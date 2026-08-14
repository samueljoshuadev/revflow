import { z } from "zod";

export const integrationProviderSchema = z.enum([
  "openai",
  "google_calendar",
  "calendly",
  "whatsapp",
]);

export const openAiSettingsSchema = z.object({
  apiKey: z.string().trim().startsWith("sk-").min(20).max(300),
  model: z.enum(["gpt-5.4-nano", "gpt-5-mini", "gpt-5"]),
  monthlyLimit: z.coerce.number().int().min(1).max(100_000),
  automaticQualification: z.boolean(),
});

export const calendlySettingsSchema = z.object({
  accessToken: z.string().trim().min(20).max(1000),
});

export const whatsappSettingsSchema = z.object({
  accessToken: z.string().trim().min(20).max(2000),
  phoneNumberId: z.string().trim().regex(/^\d{5,30}$/),
  businessAccountId: z.string().trim().regex(/^\d{5,30}$/).optional(),
  appSecret: z.string().trim().min(16).max(500),
  verifyToken: z.string().trim().min(16).max(200),
});
