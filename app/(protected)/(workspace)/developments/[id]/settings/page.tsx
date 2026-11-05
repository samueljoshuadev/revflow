import { Archive, ArrowLeft, Grid3x3, Layers, SquarePlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { DevelopmentForm, Field } from "@/components/developments/development-form";
import { Notice } from "@/components/developments/notice";
import { PageHeader } from "@/components/page-header";
import { Label, Select } from "@/components/ui/field";
import { getDevelopmentSettings } from "@/services/developments";
import { requireRealEstateAdmin } from "@/services/workspace";

import {
  archiveDevelopment,
  createTower,
  createUnit,
  generateUnits,
  updateDevelopment,
} from "../../actions";

export const metadata: Metadata = { title: "Configurar empreendimento" };

type SettingsPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function DevelopmentSettingsPage({ params, searchParams }: SettingsPageProps) {
  const { id } = await params;
  const query = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const { organization } = await requireRealEstateAdmin();
  const settings = await getDevelopmentSettings(organization.id, id);
  if (!settings) notFound();
  const { development, towers } = settings;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <Link href={`/developments/${development.id}`} className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-900"><ArrowLeft className="size-3.5" /> Voltar para o espelho</Link>
      <PageHeader eyebrow="Configuração" title={development.name} description="Blocos, unidades e regras do simulador. Somente administradores veem esta página." />
      <Notice error={query.error} message={query.message} />

      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <Card icon={Layers} title="1. Blocos / torres" description="Ex.: Torre A, Bloco 2, Quadra C. Opcional para condomínios pequenos.">
          {towers.length > 0 && (
            <ul className="mb-4 flex flex-wrap gap-2">
              {towers.map((tower) => (
                <li key={tower.id} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">{tower.name}</li>
              ))}
            </ul>
          )}
          <form action={createTower} className="flex items-end gap-2">
            <input type="hidden" name="developmentId" value={development.id} />
            <div className="flex-1"><Field label="Nome do bloco" name="name" required maxLength={80} placeholder="Torre A" /></div>
            <SubmitButton>Adicionar</SubmitButton>
          </form>
        </Card>

        <Card icon={Grid3x3} title="2. Gerar unidades em lote" description="Cria a grade do prédio: andar 1 com 4 unidades gera 101, 102, 103 e 104. Unidades já existentes são mantidas.">
          <form action={generateUnits} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <input type="hidden" name="developmentId" value={development.id} />
            <TowerSelect towers={towers} id="generate-tower" />
            <Field label="Do andar" name="floorFrom" type="number" min={-10} max={300} defaultValue={1} required />
            <Field label="Até o andar" name="floorTo" type="number" min={-10} max={300} required />
            <Field label="Unidades por andar" name="unitsPerFloor" type="number" min={1} max={99} required />
            <Field label="Preço de tabela (R$)" name="listPrice" type="number" step="0.01" min={0} required />
            <Field label="Tipologia" name="typology" maxLength={80} placeholder="2 quartos" />
            <Field label="Quartos" name="bedrooms" type="number" min={0} max={50} />
            <Field label="Área (m²)" name="areaM2" type="number" step="0.01" min={0} />
            <Field label="Vagas" name="parkingSpaces" type="number" min={0} max={50} />
            <div className="col-span-2 flex justify-end sm:col-span-3"><SubmitButton>Gerar unidades</SubmitButton></div>
          </form>
        </Card>

        <Card icon={SquarePlus} title="3. Unidade avulsa" description="Para casas, lotes ou unidades fora do padrão (ex.: Casa 12, Cobertura 01).">
          <form action={createUnit} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <input type="hidden" name="developmentId" value={development.id} />
            <TowerSelect towers={towers} id="unit-tower" />
            <Field label="Identificação" name="code" required maxLength={30} placeholder="Casa 12" />
            <Field label="Preço de tabela (R$)" name="listPrice" type="number" step="0.01" min={0} required />
            <Field label="Andar" name="floor" type="number" min={-10} max={300} />
            <Field label="Posição no andar" name="position" type="number" min={0} max={999} />
            <Field label="Tipologia" name="typology" maxLength={80} />
            <Field label="Quartos" name="bedrooms" type="number" min={0} max={50} />
            <Field label="Área (m²)" name="areaM2" type="number" step="0.01" min={0} />
            <Field label="Vagas" name="parkingSpaces" type="number" min={0} max={50} />
            <div className="col-span-2 flex justify-end sm:col-span-3"><SubmitButton>Criar unidade</SubmitButton></div>
          </form>
        </Card>

        <Card icon={Archive} title="Arquivar empreendimento" description="Some da lista e do espelho. O histórico e a auditoria são mantidos.">
          <form action={archiveDevelopment}>
            <input type="hidden" name="developmentId" value={development.id} />
            <button className="h-9 rounded-lg border border-red-200 px-4 text-xs font-semibold text-red-700 hover:bg-red-50">Arquivar</button>
          </form>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Dados e regras do simulador</h2>
        <DevelopmentForm action={updateDevelopment} development={development} submitLabel="Salvar empreendimento" />
      </div>
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Layers;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
      <div className="mb-4 flex items-start gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-dark"><Icon className="size-4" /></span>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <p className="mt-0.5 text-xs leading-5 text-gray-400">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function TowerSelect({ towers, id }: { towers: Array<{ id: string; name: string }>; id: string }) {
  return (
    <div>
      <Label htmlFor={id}>Bloco</Label>
      <Select id={id} name="towerId" defaultValue={towers[0]?.id ?? ""}>
        <option value="">Sem bloco</option>
        {towers.map((tower) => (
          <option key={tower.id} value={tower.id}>{tower.name}</option>
        ))}
      </Select>
    </div>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold whitespace-nowrap text-[#172033] shadow-sm hover:bg-brand-dark hover:text-white">
      {children}
    </button>
  );
}
