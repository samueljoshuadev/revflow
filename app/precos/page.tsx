import type { Metadata } from "next";

import { MarketingPage } from "@/components/marketing/revflow-marketing";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Preços",
  description:
    "RevFlow por R$ 297 mensais ou R$ 549,99 em pagamento único. Veja uma demonstração do fluxo comercial antes de contratar.",
  alternates: { canonical: "/precos" },
  openGraph: {
    title: "Planos RevFlow",
    description:
      "Plano mensal de R$ 297 ou acesso vitalício por R$ 549,99 para agências e imobiliárias.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Planos RevFlow",
    description:
      "Plano mensal de R$ 297 ou acesso vitalício por R$ 549,99 para agências e imobiliárias.",
    images: ["/og.png"],
  },
};

export default function PricingPageRoute() {
  return <MarketingPage variant="pricing" />;
}
