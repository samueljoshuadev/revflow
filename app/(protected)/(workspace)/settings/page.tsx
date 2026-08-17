import {
  CalendarRange,
  CheckCircle2,
  PlugZap,
  Plus,
  Workflow,
} from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Input, Label, Textarea } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { requireWorkspace } from "@/services/workspace";

import { createService, updateOrganizationSettings } from "./actions";

export const metadata = { title: "Configurações" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const { organization } = await requireWorkspace();
  const supabase = await createClient();
  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("*")
    .eq("organization_id", organization.id)
    .order("name");
  if (servicesError) throw servicesError;
  const workHours = organization.business_hours as Record<
    string,
    [string, string] | undefined
  >;
  const defaultHours = workHours?.["1"] ?? ["09:00", "18:00"];
  const canAdmin = ["owner", "admin"].includes(organization.role);
  const isRealEstate = organization.vertical === "real_estate";
  const organizationSettings =
    organization.settings &&
    typeof organization.settings === "object" &&
    !Array.isArray(organization.settings)
      ? organization.settings
      : {};
  const lossReasons = Array.isArray(organizationSettings.loss_reasons)
    ? organizationSettings.loss_reasons.filter(
        (value): value is string => typeof value === "string",
      )
    : [];

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Administração"
        title={
          isRealEstate
            ? "Configurações da imobiliária"
            : "Configurações da agência"
        }
        description={
          isRealEstate
            ? "Dados da empresa, agenda de visitas e integrações do workspace."
            : "Dados persistidos, agenda pública, serviços e integrações do workspace."
        }
      />
      {(params.error || params.message) && (
        <p
          className={`mt-6 rounded-lg border px-4 py-3 text-sm ${
            params.error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {params.error ?? params.message}
        </p>
      )}

      <form action={updateOrganizationSettings} className="mt-7 space-y-5">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
          <h2 className="text-sm font-semibold text-gray-900">Empresa</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="Nome"
              name="name"
              defaultValue={organization.name}
              required
            />
            <div>
              <Label htmlFor="verticalDisplay">Vertical</Label>
              <Input
                id="verticalDisplay"
                value={isRealEstate ? "Imobiliária" : "Agência"}
                disabled
                readOnly
                className={
                  isRealEstate
                    ? "border-[#E8A51B]/30 bg-[#FFF6D8] font-medium text-[#8B5B05]"
                    : undefined
                }
              />
            </div>
            <Field
              label="CNPJ/CPF"
              name="document"
              defaultValue={organization.document ?? ""}
            />
            <Field
              label="E-mail comercial"
              name="contactEmail"
              type="email"
              defaultValue={organization.contact_email ?? ""}
            />
            <Field
              label="Telefone"
              name="phone"
              defaultValue={organization.phone ?? ""}
            />
            <Field
              label="Site"
              name="website"
              type="url"
              defaultValue={organization.website ?? ""}
            />
            <Field
              label="Moeda"
              name="currency"
              defaultValue={organization.currency}
              maxLength={3}
              required
            />
            <Field
              label="Fuso horário"
              name="timezone"
              defaultValue={organization.timezone}
              required
            />
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
          <h2 className="text-sm font-semibold text-gray-900">
            Motivos de perda
          </h2>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Um motivo por linha. Use opções objetivas para os relatórios
            comerciais.
          </p>
          <Textarea
            name="lossReasons"
            rows={4}
            maxLength={2200}
            defaultValue={lossReasons.join("\n")}
            className="mt-4"
            placeholder={"Sem orçamento\nSem retorno\nEscolheu concorrente"}
          />
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
          <div className="flex items-center gap-2">
            <CalendarRange className="size-4 text-brand" />
            <h2 className="text-sm font-semibold text-gray-900">
              Agenda e disponibilidade
            </h2>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Início (seg–sex)"
              name="workdayStart"
              type="time"
              defaultValue={defaultHours[0]}
              required
            />
            <Field
              label="Fim (seg–sex)"
              name="workdayEnd"
              type="time"
              defaultValue={defaultHours[1]}
              required
            />
            <Field
              label="Duração padrão (min)"
              name="bookingDuration"
              type="number"
              min={15}
              max={240}
              defaultValue={organization.booking_duration_minutes}
              required
            />
            <Field
              label="Intervalo (min)"
              name="bookingBuffer"
              type="number"
              min={0}
              max={120}
              defaultValue={organization.booking_buffer_minutes}
              required
            />
          </div>
          <div className="mt-4">
            <Label htmlFor="meetingLocation">Local ou link padrão</Label>
            <Input
              id="meetingLocation"
              name="meetingLocation"
              defaultValue={organization.meeting_location ?? ""}
              placeholder="Google Meet, endereço ou link"
            />
          </div>
          <label className="mt-4 flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <input
              name="bookingEnabled"
              type="checkbox"
              defaultChecked={organization.booking_enabled}
              className="size-4 accent-brand"
            />
            Ativar página pública em{" "}
            <span className="font-mono text-xs">/book/{organization.slug}</span>
          </label>
        </section>

        {canAdmin && (
          <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-gray-950 px-4 text-sm font-medium text-white hover:bg-gray-800">
            <CheckCircle2 className="size-4" /> Salvar configurações
          </button>
        )}
      </form>

      {!isRealEstate && (
        <section className="mt-8 rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
          <h2 className="text-sm font-semibold text-gray-900">Serviços</h2>
          <div className="mt-4 divide-y divide-gray-100">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {service.name}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {service.base_price === null
                      ? "Preço não definido"
                      : formatCurrency(service.base_price)}
                    {service.meeting_duration_minutes
                      ? ` · ${service.meeting_duration_minutes} min`
                      : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] font-medium ${service.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
                >
                  {service.is_active ? "Ativo" : "Inativo"}
                </span>
              </div>
            ))}
            {services.length === 0 && (
              <p className="py-5 text-sm text-gray-400">
                Nenhum serviço cadastrado.
              </p>
            )}
          </div>
          <form
            action={createService}
            className="mt-5 grid gap-3 border-t border-gray-100 pt-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            <Field label="Novo serviço" name="name" required />
            <Field
              label="Preço base"
              name="basePrice"
              type="number"
              min={0}
              step="0.01"
            />
            <Field
              label="Reunião (min)"
              name="meetingDuration"
              type="number"
              min={15}
              max={240}
            />
            <div className="sm:col-span-2 lg:col-span-4">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                name="description"
                rows={2}
                maxLength={1000}
              />
            </div>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Plus className="size-4" /> Adicionar serviço
            </button>
          </form>
        </section>
      )}

      <section className="mt-8 rounded-xl border border-brand/20 bg-brand-soft/60 p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand shadow-xs">
              <PlugZap className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Central de Integrações
              </h2>
              <p className="mt-1 text-xs leading-5 text-gray-600">
                Conecte Google Calendar, OpenAI, WhatsApp e Calendly com ajuda
                passo a passo.
              </p>
            </div>
          </div>
          <Link
            href="/settings/integrations"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Abrir integrações
          </Link>
        </div>
      </section>
      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
              <Workflow className="size-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Entradas e automações
              </h2>
              <p className="mt-1 text-xs leading-5 text-gray-600">
                Importação, formulários, webhooks, follow-ups e regras seguras
                do Kanban.
              </p>
            </div>
          </div>
          <Link
            href="/settings/automation"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Configurar operação
          </Link>
        </div>
      </section>
    </div>
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
