import { NextResponse } from "next/server";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isSupabaseConfigured()) {
    const diagnosticId = crypto.randomUUID();
    return NextResponse.json(
      { status: "not_ready", database: "not_configured", diagnosticId },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("healthcheck", {});
    if (error) throw error;
    return NextResponse.json(
      { status: "ok", database: "reachable" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    const diagnosticId = crypto.randomUUID();
    console.error("healthcheck_failed", { diagnosticId });
    return NextResponse.json(
      { status: "degraded", database: "unreachable", diagnosticId },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
