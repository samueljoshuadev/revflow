import { Building2, CalendarDays, Check, Home, MapPin, Sparkles } from "lucide-react";
import Link from "next/link";

import { Input, Label, Select } from "@/components/ui/field";
import { formatCurrency } from "@/lib/utils";
import type { getLeadRealEstateData } from "@/services/real-estate-matching";

type RealEstateData = Awaited<ReturnType<typeof getLeadRealEstateData>>;

type LeadRealEstatePanelProps = {
  leadId: string;
  data: RealEstateData;
  saveProfileAction: (formData: FormData) => Promise<void>;
  recommendPropertyAction: (formData: FormData) => Promise<void>;
  updateMatchStatusAction: (formData: FormData) => Promise<void>;
};

const typeLabels = {
  apartment: "Apartamento",
  house: "Casa",
  commercial: "Comercial",
  land: "Terreno",
  rural: "Rural",
  other: "Outro",
};

const statusLabels = {
  recommended: "Recomendado",
  sent: "Enviado",
  favorite: "Favorito",
  rejected: "Recusado",
  visit_scheduled: "Visita agendada",
};

export function LeadRealEstatePanel({
  leadId,
  data,
  saveProfileAction,
  recommendPropertyAction,
  updateMatchStatusAction,
}: LeadRealEstatePanelProps) {
  const matchedPropertyIds = new Set(data.matches.map((match) => match.property_id));
  const availableRecommendations = data.recommendations.filter(
    (recommendation) => !matchedPropertyIds.has(recommendation.property.id),
  );

  return (
    <section className="overflow-hidden rounded-xl border border-[#E8A51B]/25 bg-white shadow-xs">
      <div className="border-b border-[#E8A51B]/15 bg-gradient-to-r from-[#FFF6D8] to-white p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#E8A51B] text-[#172033] shadow-sm"><Home className="size-5" /></span>
          <div><p className="text-[10px] font-semibold tracking-[0.14em] text-[#A56604] uppercase">Perfil imobiliário</p><h2 className="mt-0.5 text-base font-semibold text-[#172033]">Preferências e matching</h2></div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <form action={saveProfileAction}>
          <input type="hidden" name="leadId" value={leadId} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Investimento mínimo" name="budgetMin" type="number" min={0} step="0.01" defaultValue={data.profile?.budget_min ?? ""} />
            <Field label="Investimento máximo" name="budgetMax" type="number" min={0} step="0.01" defaultValue={data.profile?.budget_max ?? ""} />
            <Field label="Cidade" name="preferredCity" defaultValue={data.profile?.preferred_city ?? ""} />
            <Field label="Bairro" name="preferredNeighborhood" defaultValue={data.profile?.preferred_neighborhood ?? ""} />
            <div><Label htmlFor="propertyType">Tipo de imóvel</Label><Select id="propertyType" name="propertyType" defaultValue={data.profile?.property_type ?? ""}><option value="">Qualquer tipo</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>
            <div><Label htmlFor="purpose">Finalidade</Label><Select id="purpose" name="purpose" defaultValue={data.profile?.purpose ?? ""}><option value="">Não definida</option><option value="sale">Compra</option><option value="rent">Locação</option></Select></div>
            <Field label="Quartos mínimos" name="minimumBedrooms" type="number" min={0} defaultValue={data.profile?.minimum_bedrooms ?? ""} />
            <div><Label htmlFor="paymentMethod">Forma de pagamento</Label><Select id="paymentMethod" name="paymentMethod" defaultValue={data.profile?.payment_method ?? ""}><option value="">Não definida</option><option value="cash">À vista</option><option value="financing">Financiamento</option><option value="consortium">Consórcio</option><option value="exchange">Permuta</option><option value="other">Outra</option></Select></div>
            <Field label="Entrada disponível" name="availableDownPayment" type="number" min={0} step="0.01" defaultValue={data.profile?.available_down_payment ?? ""} />
            <div><Label htmlFor="urgency">Urgência</Label><Select id="urgency" name="urgency" defaultValue={data.profile?.urgency ?? ""}><option value="">Não definida</option><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option><option value="immediate">Imediata</option></Select></div>
            <Field label="Prazo de compra" name="purchaseDeadline" type="date" defaultValue={data.profile?.purchase_deadline ?? ""} />
          </div>
          <button className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[#172033] px-4 text-xs font-semibold text-white hover:bg-[#26324b]"><Check className="size-4 text-[#FFD978]" /> Salvar perfil</button>
        </form>

        <div className="mt-7 border-t border-gray-100 pt-6">
          <div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-gray-900">Imóveis relacionados</h3><p className="mt-1 text-xs text-gray-400">Recomendações registradas no histórico do lead</p></div><span className="rounded-full bg-[#FFF6D8] px-2.5 py-1 text-xs font-semibold text-[#8B5B05]">{data.matches.length}</span></div>
          {data.matches.length ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">{data.matches.map((match) => (
              <article key={match.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link href={`/properties/${match.property.id}`} className="text-xs font-semibold text-gray-900 hover:text-brand-dark">{match.property.code} · {match.property.title}</Link><p className="mt-1 flex items-center gap-1 text-[10px] text-gray-400"><MapPin className="size-3" />{match.property.neighborhood ? `${match.property.neighborhood}, ` : ""}{match.property.city}</p></div><span className="text-lg font-bold text-brand-dark">{match.score}%</span></div>
                <p className="mt-3 text-[11px] leading-5 text-gray-500">{match.match_reason}</p>
                <div className="mt-4 flex items-center gap-2">
                  <form action={updateMatchStatusAction} className="flex-1"><input type="hidden" name="leadId" value={leadId} /><input type="hidden" name="matchId" value={match.id} /><Select name="status" defaultValue={match.status} className="h-9 text-xs" onChange={undefined}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select><button className="mt-2 h-8 w-full rounded-lg border border-gray-200 text-[11px] font-medium text-gray-600 hover:bg-gray-50">Atualizar status</button></form>
                  <Link href={`/calendar?leadId=${leadId}&propertyId=${match.property.id}`} className="flex size-9 items-center justify-center rounded-lg bg-[#FFF6D8] text-brand-dark" aria-label="Agendar visita"><CalendarDays className="size-4" /></Link>
                </div>
              </article>
            ))}</div>
          ) : <p className="mt-4 rounded-lg bg-gray-50 p-4 text-xs text-gray-400">Nenhum imóvel recomendado ainda.</p>}
        </div>

        <div className="mt-7 border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2"><Sparkles className="size-4 text-brand-dark" /><h3 className="text-sm font-semibold text-gray-900">Sugestões determinísticas</h3></div>
          <p className="mt-1 text-xs text-gray-400">Calculadas por orçamento, localização, finalidade, tipo e quartos. Não dependem de IA.</p>
          {!data.profile ? <p className="mt-4 rounded-lg bg-[#FFF6D8] p-4 text-xs leading-5 text-[#76500A]">Preencha o perfil imobiliário para calcular recomendações.</p> : availableRecommendations.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{availableRecommendations.map((recommendation) => (
              <article key={recommendation.property.id} className="rounded-xl border border-[#E8A51B]/20 bg-[#FFFDF8] p-4"><div className="flex items-start justify-between"><Building2 className="size-5 text-brand-dark" /><span className="rounded-full bg-[#E8A51B] px-2 py-1 text-[10px] font-bold text-[#172033]">{recommendation.score}%</span></div><Link href={`/properties/${recommendation.property.id}`} className="mt-3 block text-xs font-semibold text-gray-900 hover:text-brand-dark">{recommendation.property.code} · {recommendation.property.title}</Link><p className="mt-1 text-xs font-medium text-[#172033]">{formatCurrency(recommendation.property.price)}</p><p className="mt-2 line-clamp-2 text-[10px] leading-4 text-gray-500">{recommendation.reasons.join(", ")}</p><form action={recommendPropertyAction} className="mt-3"><input type="hidden" name="leadId" value={leadId} /><input type="hidden" name="propertyId" value={recommendation.property.id} /><button className="h-8 w-full rounded-lg bg-[#172033] text-[11px] font-semibold text-white hover:bg-[#26324b]">Recomendar ao lead</button></form></article>
            ))}</div>
          ) : <p className="mt-4 rounded-lg bg-gray-50 p-4 text-xs text-gray-400">Nenhum imóvel disponível atingiu os critérios mínimos deste perfil.</p>}
        </div>
      </div>
    </section>
  );
}

function Field({ label, name, ...props }: React.ComponentProps<typeof Input> & { label: string; name: string }) {
  return <div><Label htmlFor={name}>{label}</Label><Input id={name} name={name} {...props} /></div>;
}

