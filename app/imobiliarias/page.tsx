import type { Metadata } from "next";

import { MarketingPage } from "@/components/marketing/revflow-marketing";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "CRM para imobiliárias",
  description:
    "RevFlow para Imobiliárias: organize leads, visitas, corretores e negociações em um único fluxo comercial.",
  alternates: {
    canonical: "/imobiliarias",
  },
  openGraph: {
    title: "RevFlow para Imobiliárias",
    description: "Cada lead merece virar uma visita.",
  },
};

export default function RealEstatePage() {
  return <MarketingPage variant="real-estate" />;
}
