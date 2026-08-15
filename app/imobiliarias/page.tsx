import type { Metadata } from "next";

import { RealEstateLanding } from "@/components/imobiliarias/real-estate-landing";

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
    images: ["/og-imobiliarias.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "RevFlow para Imobiliárias",
    description: "Cada lead merece virar uma visita.",
    images: ["/og-imobiliarias.png"],
  },
};

export default function RealEstatePage() {
  return <RealEstateLanding />;
}
