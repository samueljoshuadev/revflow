import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function formatCurrency(value: number | null | undefined) {
  if (value == null) return "Sem valor";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRelativeDate(value: string | null | undefined) {
  if (!value) return "Sem interação";

  const date = new Date(value);
  const now = new Date();
  const diffMinutes = Math.round((now.getTime() - date.getTime()) / 60_000);

  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `há ${diffMinutes} min`;
  if (diffMinutes < 1_440) return `há ${Math.floor(diffMinutes / 60)} h`;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}
