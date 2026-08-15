import type { Metadata } from "next";

import { MarketingPage } from "@/components/marketing/revflow-marketing";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "RevFlow | Operação comercial em movimento",
  description:
    "RevFlow organiza o processo comercial de agências e imobiliárias em um fluxo claro, rastreável e acionável.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "RevFlow | Operação comercial em movimento",
    description: "Menos oportunidades esquecidas. Mais negócios em movimento.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "RevFlow | Operação comercial em movimento",
    description: "Menos oportunidades esquecidas. Mais negócios em movimento.",
    images: ["/og.png"],
  },
};

export default function HomePage() {
  return <MarketingPage variant="home" />;
}
