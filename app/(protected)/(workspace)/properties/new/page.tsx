import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { PropertyForm } from "@/components/properties/property-form";
import { getOrganizationMembers } from "@/services/organizations";
import { requireRealEstateWorkspace } from "@/services/workspace";

import { createProperty } from "../actions";

export const metadata = { title: "Novo imóvel" };

export default async function NewPropertyPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const { organization } = await requireRealEstateWorkspace();
  const members = await getOrganizationMembers(organization.id);
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <Link href="/properties" className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="size-3.5" /> Voltar para imóveis</Link>
      <PageHeader eyebrow="Portfólio imobiliário" title="Cadastrar imóvel" description="Registre somente informações reais. O imóvel ficará isolado nesta organização." />
      {params.error && <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{params.error}</p>}
      <div className="mt-7"><PropertyForm action={createProperty} members={members} /></div>
    </div>
  );
}

