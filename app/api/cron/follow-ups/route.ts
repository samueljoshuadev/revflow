import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET?.trim();
  const provided = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (!expected || !provided || !safeEqual(expected, provided)) {
    return NextResponse.json({ error: "cron_unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin)
    return NextResponse.json(
      { error: "cron_platform_not_ready" },
      { status: 503 },
    );

  const { data: followUps, error: followUpError } = await admin.rpc(
    "process_due_followups",
    { p_limit: 200 },
  );
  if (followUpError) {
    console.error("follow_up_processing_failed", { code: followUpError.code });
    return NextResponse.json(
      { error: "follow_up_processing_failed" },
      { status: 500 },
    );
  }
  const { data: outbox, error: claimError } = await admin.rpc(
    "claim_notification_outbox",
    { p_limit: 50 },
  );
  if (claimError) {
    console.error("notification_claim_failed", { code: claimError.code });
    return NextResponse.json(
      { error: "notification_claim_failed" },
      { status: 500 },
    );
  }

  let sent = 0;
  let failed = 0;
  let blocked = 0;
  for (const item of outbox ?? []) {
    const result = await deliverEmail(item.user_id, item.notification_id);
    const { error } = await admin.rpc("complete_notification_delivery", {
      p_outbox_id: item.id,
      p_status: result.status,
      p_error: result.error,
    });
    if (error)
      console.error("notification_completion_failed", { code: error.code });
    if (result.status === "sent") sent += 1;
    else if (result.status === "blocked") blocked += 1;
    else failed += 1;
  }
  return NextResponse.json({
    followUps,
    delivery: { claimed: outbox?.length ?? 0, sent, failed, blocked },
  });
}

async function deliverEmail(
  userId: string,
  notificationId: string,
): Promise<{ status: "sent" | "failed" | "blocked"; error: string | null }> {
  const admin = createAdminClient();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.NOTIFICATION_FROM_EMAIL?.trim();
  if (!admin || !apiKey || !from)
    return { status: "blocked", error: "email_provider_not_configured" };
  const [{ data: userResult }, notificationResult] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin
      .from("notifications")
      .select("title, body, lead_id")
      .eq("id", notificationId)
      .maybeSingle(),
  ]);
  const email = userResult.user?.email;
  if (!email || notificationResult.error || !notificationResult.data)
    return { status: "blocked", error: "recipient_not_available" };
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": notificationId,
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: notificationResult.data.title,
        text: `${notificationResult.data.body}\n\n${notificationResult.data.lead_id && appUrl ? `${appUrl}/leads/${notificationResult.data.lead_id}` : appUrl}`,
      }),
    });
    if (!response.ok)
      return {
        status: response.status >= 500 ? "failed" : "blocked",
        error: `email_provider_${response.status}`,
      };
    return { status: "sent", error: null };
  } catch {
    return { status: "failed", error: "email_provider_unreachable" };
  }
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
