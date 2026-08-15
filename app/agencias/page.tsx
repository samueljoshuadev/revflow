import type { Metadata } from "next";

import { MarketingPage } from "@/components/marketing/revflow-marketing";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "CRM para agências",
  description:
    "RevFlow para Agências: transforme cada oportunidade em um processo comercial claro, com agenda, follow-ups e histórico.",
  alternates: { canonical: "/agencias" },
  openGraph: {
    title: "RevFlow para Agências",
    description: "Transforme cada oportunidade em um processo comercial claro.",
  },
};

export default function AgencyMarketingPage() {
  return <MarketingPage variant="agency" />;
}
