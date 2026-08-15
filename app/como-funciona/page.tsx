import type { Metadata } from "next";

import { MarketingPage } from "@/components/marketing/revflow-marketing";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Como funciona",
  description:
    "Veja como o RevFlow organiza leads, responsáveis, agenda, follow-ups e negociações para agências e imobiliárias.",
  alternates: { canonical: "/como-funciona" },
  openGraph: {
    title: "Como funciona o RevFlow",
    description:
      "Do primeiro contato à próxima ação, tudo dentro do mesmo fluxo comercial.",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Como funciona o RevFlow",
    description:
      "Conheça o fluxo comercial do RevFlow antes de criar uma conta.",
    images: ["/og.png"],
  },
};

export default function HowItWorksRoute() {
  return <MarketingPage variant="how-it-works" />;
}
