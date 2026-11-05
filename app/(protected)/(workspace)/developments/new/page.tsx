import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { DevelopmentForm } from "@/components/developments/development-form";
import { Notice } from "@/components/developments/notice";
import { PageHeader } from "@/components/page-header";
import { requireRealEstateAdmin } from "@/services/workspace";

import { createDevelopment } from "../actions";

export const metadata = { title: "Novo empreendimento" };

export default async function NewDevelopmentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  await requireRealEstateAdmin();
  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <Link href="/developments" className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="size-3.5" /> Voltar para empreendimentos</Link>
      <PageHeader eyebrow="Espelho de vendas" title="Cadastrar empreendimento" description="Depois de salvar, você cria os blocos e gera as unidades." />
      <Notice error={params.error} />
      <div className="mt-7"><DevelopmentForm action={createDevelopment} submitLabel="Criar empreendimento" /></div>
    </div>
  );
}
