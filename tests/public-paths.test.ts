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
    "/auth/callback",
    "/book/revflow",
    "/api/health",
    "/api/webhooks/whatsapp/connection",
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
  ])("keeps %s protected", (pathname) => {
    expect(isPublicPath(pathname)).toBe(false);
  });
});
