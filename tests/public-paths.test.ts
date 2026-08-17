import { describe, expect, it } from "vitest";

import { isPublicPath } from "../lib/routing/public-paths";

describe("public routes", () => {
  it.each([
    "/",
    "/login",
    "/agencias",
    "/imobiliarias",
    "/como-funciona",
    "/precos",
    "/privacidade",
    "/termos",
    "/exclusao-de-dados",
    "/auth/callback",
    "/book/revflow",
    "/api/health",
    "/api/webhooks/whatsapp/connection",
    "/api/webhooks/whatsapp/meta",
    "/capture/revflow/site",
    "/api/public/leads/revflow/site",
    "/api/cron/follow-ups",
  ])("allows %s without a session", (pathname) => {
    expect(isPublicPath(pathname)).toBe(true);
  });

  it.each([
    "/dashboard",
    "/leads",
    "/properties",
    "/calendar",
    "/settings",
    "/api/integrations/google/start",
    "/api/integrations/meta/session",
    "/api/integrations/meta/complete",
    "/api/leads/import",
  ])("keeps %s protected", (pathname) => {
    expect(isPublicPath(pathname)).toBe(false);
  });
});
