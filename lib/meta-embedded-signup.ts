export type MetaEmbeddedSignupResult = {
  businessAccountId: string;
  phoneNumberId: string;
};

export type MetaEmbeddedSignupEvent =
  | { type: "finished"; result: MetaEmbeddedSignupResult }
  | { type: "cancelled" }
  | { type: "error" }
  | null;

const allowedMetaOrigins = new Set([
  "https://www.facebook.com",
  "https://web.facebook.com",
]);

export function parseMetaEmbeddedSignupMessage(input: {
  origin: string;
  data: unknown;
}): MetaEmbeddedSignupEvent {
  if (!allowedMetaOrigins.has(input.origin)) return null;

  let value: unknown = input.data;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  if (!isRecord(value) || value.type !== "WA_EMBEDDED_SIGNUP") return null;

  if (value.event === "CANCEL") return { type: "cancelled" };
  if (value.event === "ERROR") return { type: "error" };
  if (value.event !== "FINISH" || !isRecord(value.data)) return null;

  const businessAccountId = value.data.waba_id;
  const phoneNumberId = value.data.phone_number_id;
  if (
    typeof businessAccountId !== "string" ||
    !/^\d{5,30}$/.test(businessAccountId) ||
    typeof phoneNumberId !== "string" ||
    !/^\d{5,30}$/.test(phoneNumberId)
  ) {
    return { type: "error" };
  }

  return {
    type: "finished",
    result: { businessAccountId, phoneNumberId },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
