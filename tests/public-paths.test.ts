import { describe, expect, it } from "vitest";

import { isPublicPath } from "../lib/routing/public-paths";

describe("public routes", () => {
  it.each([
    "/",
    "/login",
    "/imobiliarias",
    "/privacidade",
    "/termos",
    "/exclusao-de-dados",
    "/auth/callback",
    "/book/loovimob",
    "/api/health",
    "/api/webhooks/whatsapp/connection",
    "/api/webhooks/whatsapp/meta",
    "/capture/loovimob/site",
    "/api/public/leads/loovimob/site",
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
