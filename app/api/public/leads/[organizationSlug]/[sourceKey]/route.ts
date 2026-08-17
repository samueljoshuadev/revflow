import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  PayloadTooLargeError,
  readLimitedJson,
} from "@/lib/http/read-limited-json";
import { createClient } from "@/lib/supabase/server";

const schema = z
  .object({
    name: z.string().trim().min(2).max(160),
    email: z.preprocess(
      (value) => (value === "" || value === undefined ? null : value),
      z.email().max(254).nullable(),
    ),
    phone: z.preprocess(
      (value) => (value === "" || value === undefined ? null : value),
      z.string().trim().max(40).nullable(),
    ),
    company: z.preprocess(
      (value) => (value === "" || value === undefined ? null : value),
      z.string().trim().max(160).nullable(),
    ),
    summary: z.preprocess(
      (value) => (value === "" || value === undefined ? null : value),
      z.string().trim().max(2000).nullable(),
    ),
  })
  .refine((value) => value.email || value.phone, {
    message: "contact_required",
  });

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{ organizationSlug: string; sourceKey: string }>;
  },
) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (token.length < 32 || !/^[A-Za-z0-9_-]{16,160}$/.test(idempotencyKey)) {
    return NextResponse.json(
      { error: "unauthorized_or_missing_idempotency" },
      { status: 401 },
    );
  }
  let json: unknown;
  try {
    json = await readLimitedJson(request, 32_000);
  } catch (error) {
    if (!(error instanceof PayloadTooLargeError)) throw error;
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }
  const input = schema.safeParse(json);
  if (!input.success)
    return NextResponse.json({ error: "invalid_lead" }, { status: 400 });
  const { organizationSlug, sourceKey } = await context.params;
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(organizationSlug) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sourceKey)
  ) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const identifier =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    input.data.email ||
    input.data.phone ||
    "webhook";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("capture_external_lead", {
    p_organization_slug: organizationSlug,
    p_source_key: sourceKey,
    p_channel: "webhook",
    p_token: token,
    p_idempotency_key: idempotencyKey,
    p_identifier: identifier,
    p_name: input.data.name,
    p_email: input.data.email ?? "",
    p_phone: input.data.phone ?? "",
    p_company: input.data.company,
    p_summary: input.data.summary,
    p_website: null,
  });
  if (error) {
    const code = error.message.includes("rate_limited")
      ? "rate_limited"
      : error.message.includes("token")
        ? "unauthorized"
        : "intake_failed";
    return NextResponse.json(
      { error: code },
      {
        status:
          code === "rate_limited" ? 429 : code === "unauthorized" ? 401 : 422,
      },
    );
  }
  const result =
    data && typeof data === "object" && !Array.isArray(data) ? data : {};
  return NextResponse.json(
    {
      accepted: result.accepted === true,
      duplicate: result.duplicate === true,
      replayed: result.replayed === true,
    },
    { status: 202 },
  );
}
