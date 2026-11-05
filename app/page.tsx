import type { Metadata } from "next";

import { RealEstateLanding } from "@/components/imobiliarias/real-estate-landing";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Loovimob | CRM para imobiliárias e incorporadoras",
  description:
    "Loovimob organiza leads, espelho de vendas, propostas, visitas e corretores em um único fluxo comercial.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Loovimob | CRM para imobiliárias e incorporadoras",
    description: "Do lead ao contrato, sem planilha.",
    images: ["/og-imobiliarias.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Loovimob | CRM para imobiliárias e incorporadoras",
    description: "Do lead ao contrato, sem planilha.",
    images: ["/og-imobiliarias.png"],
  },
};

export default function HomePage() {
  return <RealEstateLanding />;
}
