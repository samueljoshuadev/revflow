import type { DeterministicPropertyMatch } from "@/types/crm";
import type { Tables } from "@/types/database";

function normalize(value: string | null) {
  return value
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function scorePropertyMatch(
  profile: Tables<"real_estate_lead_profiles">,
  property: Tables<"properties">,
): DeterministicPropertyMatch {
  let score = 0;
  const reasons: string[] = [];

  if (profile.budget_max !== null && property.price <= profile.budget_max) {
    score += 25;
    reasons.push("dentro do orçamento máximo");
    if (profile.budget_min === null || property.price >= profile.budget_min) {
      score += 5;
      reasons.push("na faixa de investimento");
    }
  }
  if (
    profile.preferred_city &&
    normalize(property.city) === normalize(profile.preferred_city)
  ) {
    score += 20;
    reasons.push("cidade desejada");
  }
  if (
    profile.preferred_neighborhood &&
    normalize(property.neighborhood) ===
      normalize(profile.preferred_neighborhood)
  ) {
    score += 15;
    reasons.push("bairro desejado");
  }
  if (profile.purpose && property.purpose === profile.purpose) {
    score += 15;
    reasons.push(
      profile.purpose === "sale"
        ? "disponível para compra"
        : "disponível para locação",
    );
  }
  if (
    profile.property_type &&
    property.property_type === profile.property_type
  ) {
    score += 10;
    reasons.push("tipo de imóvel compatível");
  }
  if (
    profile.minimum_bedrooms !== null &&
    property.bedrooms !== null &&
    property.bedrooms >= profile.minimum_bedrooms
  ) {
    score += 10;
    reasons.push("quantidade de quartos compatível");
  }

  return { property, score: Math.min(score, 100), reasons };
}

