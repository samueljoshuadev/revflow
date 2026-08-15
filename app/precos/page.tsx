import type { Metadata } from "next";

import { MarketingPage } from "@/components/marketing/revflow-marketing";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Preços",
  description:
    "Planos RevFlow para agências e imobiliárias: R$ 97 por usuário ativo ao mês.",
  alternates: { canonical: "/precos" },
  openGraph: {
    title: "Planos RevFlow",
    description: "Organize sua operação comercial por R$ 97 por usuário ativo ao mês.",
  },
};

export default function PricingPageRoute() {
  return <MarketingPage variant="pricing" />;
}
