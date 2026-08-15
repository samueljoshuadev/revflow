import { Building2, CheckCircle2 } from "lucide-react";

import { Input, Label, Select, Textarea } from "@/components/ui/field";
import type { Tables } from "@/types/database";

type PropertyFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  members: Array<{
    user_id: string;
    profile: { full_name: string | null } | null;
  }>;
  property?: Tables<"properties">;
};

const propertyTypeOptions = [
  ["apartment", "Apartamento"],
  ["house", "Casa"],
  ["commercial", "Comercial"],
  ["land", "Terreno"],
  ["rural", "Rural"],
  ["other", "Outro"],
] as const;

export function PropertyForm({ action, members, property }: PropertyFormProps) {
  return (
    <form action={action} className="space-y-5">
      {property && <input type="hidden" name="propertyId" value={property.id} />}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand-dark">
            <Building2 className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Identificação</h2>
            <p className="mt-0.5 text-xs text-gray-400">
              Informações usadas na busca e no atendimento comercial.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Código" name="code" defaultValue={property?.code} required />
          <div className="sm:col-span-2">
            <Field label="Título" name="title" defaultValue={property?.title} required />
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" defaultValue={property?.status ?? "available"}>
              <option value="available">Disponível</option>
              <option value="reserved">Reservado</option>
              <option value="sold">Vendido</option>
              <option value="inactive">Inativo</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="propertyType">Tipo</Label>
            <Select id="propertyType" name="propertyType" defaultValue={property?.property_type ?? "apartment"}>
              {propertyTypeOptions.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="purpose">Finalidade</Label>
            <Select id="purpose" name="purpose" defaultValue={property?.purpose ?? "sale"}>
              <option value="sale">Venda</option>
              <option value="rent">Locação</option>
            </Select>
          </div>
          <Field label="Preço" name="price" type="number" min={0} step="0.01" defaultValue={property?.price} required />
          <div>
            <Label htmlFor="responsibleUserId">Responsável</Label>
            <Select id="responsibleUserId" name="responsibleUserId" defaultValue={property?.responsible_user_id ?? ""}>
              <option value="">Sem responsável</option>
              {members.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.profile?.full_name ?? "Membro"}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
        <h2 className="text-sm font-semibold text-gray-900">Localização e estrutura</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Cidade" name="city" defaultValue={property?.city} required />
          <Field label="Bairro" name="neighborhood" defaultValue={property?.neighborhood ?? ""} />
          <Field label="Área (m²)" name="areaM2" type="number" min={0} step="0.01" defaultValue={property?.area_m2 ?? ""} />
          <Field label="Quartos" name="bedrooms" type="number" min={0} defaultValue={property?.bedrooms ?? ""} />
          <Field label="Banheiros" name="bathrooms" type="number" min={0} defaultValue={property?.bathrooms ?? ""} />
          <Field label="Vagas" name="parkingSpaces" type="number" min={0} defaultValue={property?.parking_spaces ?? ""} />
        </div>
        <div className="mt-4">
          <Label htmlFor="features">Características</Label>
          <Input
            id="features"
            name="features"
            defaultValue={property?.features.join(", ") ?? ""}
            placeholder="Ex.: varanda, piscina, portaria 24h"
          />
          <p className="mt-1 text-[10px] text-gray-400">Separe as características por vírgula.</p>
        </div>
        <div className="mt-4">
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" name="description" rows={5} maxLength={5000} defaultValue={property?.description ?? ""} />
        </div>
      </section>

      <button className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-[#172033] shadow-[0_10px_24px_rgba(199,123,8,0.18)] hover:bg-brand-dark hover:text-white">
        <CheckCircle2 className="size-4" />
        {property ? "Salvar imóvel" : "Cadastrar imóvel"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; name: string }) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}

