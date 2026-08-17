import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  PayloadTooLargeError,
  readLimitedJson,
} from "@/lib/http/read-limited-json";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/services/workspace";
import type { Json } from "@/types/database";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.string().trim().max(max).nullable(),
  );

const rowSchema = z.object({
  rowNumber: z.number().int().min(1).max(500),
  name: z.string().trim().min(2).max(160),
  email: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.email().max(254).nullable(),
  ),
  phone: optionalText(40),
  company: optionalText(160),
  source: optionalText(100),
  campaign: optionalText(160),
  summary: optionalText(2000),
  nextAction: optionalText(500),
  nextActionAt: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.iso.datetime({ offset: true }).nullable(),
  ),
  serviceId: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.uuid().nullable(),
  ),
  ownerId: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.uuid().nullable(),
  ),
  estimatedBudget: z.preprocess(
    parseOptionalMoney,
    z.number().min(0).max(999_999_999).nullable(),
  ),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
});

const requestSchema = z.object({
  importKey: z.string().trim().min(16).max(120),
  fileName: z.string().trim().min(1).max(180),
  rows: z.array(z.record(z.string(), z.unknown())).min(1).max(500),
});

export async function POST(request: NextRequest) {
  const { organization } = await requireWorkspace();
  if (organization.role === "viewer") {
    return NextResponse.json(
      { error: "import_write_forbidden" },
      { status: 403 },
    );
  }
  let json: unknown;
  try {
    json = await readLimitedJson(request, 1_500_000);
  } catch (error) {
    if (!(error instanceof PayloadTooLargeError)) throw error;
    return NextResponse.json(
      { error: "import_payload_too_large" },
      { status: 413 },
    );
  }
  const body = requestSchema.safeParse(json);
  if (!body.success) {
    return NextResponse.json(
      { error: "import_invalid_payload" },
      { status: 400 },
    );
  }

  const validRows: Json[] = [];
  const results: ImportResult[] = [];
  const seenRows = new Set<number>();
  for (const candidate of body.data.rows) {
    const parsed = rowSchema.safeParse(candidate);
    const fallbackRow = Number(candidate.rowNumber);
    if (!parsed.success || seenRows.has(fallbackRow)) {
      results.push({
        rowNumber: Number.isInteger(fallbackRow)
          ? fallbackRow
          : results.length + 1,
        status: "invalid",
        reason: firstIssue(parsed),
      });
      continue;
    }
    seenRows.add(parsed.data.rowNumber);
    validRows.push({
      row_number: parsed.data.rowNumber,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      company: parsed.data.company,
      source: parsed.data.source,
      campaign: parsed.data.campaign,
      summary: parsed.data.summary,
      next_action: parsed.data.nextAction,
      next_action_at: parsed.data.nextActionAt,
      service_id: parsed.data.serviceId,
      owner_id: parsed.data.ownerId,
      estimated_budget: parsed.data.estimatedBudget,
      priority: parsed.data.priority,
    });
  }

  if (validRows.length > 0) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("import_lead_batch", {
      p_organization_id: organization.id,
      p_import_key: body.data.importKey,
      p_file_name: body.data.fileName,
      p_rows: validRows,
    });
    if (error) {
      console.error("lead_import_failed", { code: error.code });
      return NextResponse.json(
        { error: "import_persistence_failed" },
        { status: 422 },
      );
    }
    const stored = asRecord(data);
    if (Array.isArray(stored.results)) {
      for (const item of stored.results) {
        const value = asRecord(item);
        const rowNumber = Number(value.row_number);
        if (!Number.isInteger(rowNumber)) continue;
        results.push({
          rowNumber,
          status:
            value.status === "created" || value.status === "duplicate"
              ? value.status
              : "invalid",
          reason: typeof value.reason === "string" ? value.reason : undefined,
        });
      }
    }
  }

  results.sort((left, right) => left.rowNumber - right.rowNumber);
  return NextResponse.json({
    results,
    summary: {
      total: body.data.rows.length,
      created: results.filter((item) => item.status === "created").length,
      duplicate: results.filter((item) => item.status === "duplicate").length,
      invalid: results.filter((item) => item.status === "invalid").length,
    },
  });
}

type ImportResult = {
  rowNumber: number;
  status: "created" | "duplicate" | "invalid";
  reason?: string;
};

function parseOptionalMoney(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  const compact = value.trim().replace(/R\$/gi, "").replaceAll(" ", "");
  const normalized = compact.includes(",")
    ? compact.replaceAll(".", "").replace(",", ".")
    : compact;
  return Number(normalized);
}

function firstIssue(result: ReturnType<typeof rowSchema.safeParse>) {
  if (result.success) return "Número de linha repetido.";
  const field = result.error.issues[0]?.path[0];
  const labels: Record<string, string> = {
    name: "Nome inválido.",
    email: "E-mail inválido.",
    phone: "Telefone inválido.",
    estimatedBudget: "Valor estimado inválido.",
    nextActionAt: "Data da próxima ação inválida.",
  };
  return typeof field === "string"
    ? (labels[field] ?? "Linha inválida.")
    : "Linha inválida.";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
