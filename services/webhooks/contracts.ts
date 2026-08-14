import { z } from "zod";

export const webhookProviderSchema = z.enum([
  "calendly",
  "whatsapp",
  "forms",
  "meta",
  "n8n",
]);

export type WebhookProvider = z.infer<typeof webhookProviderSchema>;

export type VerifiedWebhook = {
  organizationId: string | null;
  provider: WebhookProvider;
  externalEventId: string;
  payload: Record<string, unknown>;
};

export interface WebhookVerifier {
  verify(request: Request, rawBody: string): Promise<VerifiedWebhook>;
}

/**
 * Each provider needs its own signature verifier. A generic "shared secret"
 * endpoint is intentionally not exposed because provider schemes differ.
 */
export function unsupportedWebhookProvider(provider: never): never {
  throw new Error(`Unsupported webhook provider: ${String(provider)}`);
}
