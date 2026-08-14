import { CalendarCheck2, Clock3, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Brand } from "@/components/brand";
import { SetupRequired } from "@/components/setup-required";
import { Input, Label, Select } from "@/components/ui/field";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

import { bookMeeting } from "./actions";

const profileSchema = z.object({
  name: z.string(),
  slug: z.string(),
  timezone: z.string(),
  booking_duration_minutes: z.number(),
  business_hours: z.unknown(),
  meeting_location: z.string().nullable(),
});

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  if (!isSupabaseConfigured()) return <SetupRequired />;
  const [{ organizationSlug }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_booking_profile", {
    p_slug: organizationSlug,
  });
  if (error) throw error;
  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) notFound();
  const profile = parsed.data;

  return (
    <main className="min-h-screen bg-[#f5f6fa] p-5 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <Brand />
        <div className="mt-10 grid overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-200/40 lg:grid-cols-[0.82fr_1.18fr]">
          <section className="bg-gray-950 p-7 text-white sm:p-10">
            <p className="text-xs font-semibold tracking-widest text-violet-300 uppercase">
              Agendamento
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">
              Converse com {profile.name}
            </h1>
            <p className="mt-4 text-sm leading-7 text-gray-400">
              Escolha um horário disponível. Seus dados serão usados apenas para
              criar o contato e organizar esta reunião.
            </p>
            <div className="mt-8 space-y-4 text-sm text-gray-300">
              <p className="flex items-center gap-3">
                <Clock3 className="size-4 text-violet-300" />{" "}
                {profile.booking_duration_minutes} minutos
              </p>
              <p className="flex items-center gap-3">
                <CalendarCheck2 className="size-4 text-violet-300" /> Fuso:{" "}
                {profile.timezone}
              </p>
              <p className="flex items-center gap-3">
                <ShieldCheck className="size-4 text-emerald-400" /> Confirmação
                sem dados fictícios
              </p>
            </div>
          </section>
          <section className="p-7 sm:p-10">
            {query.success ? (
              <div className="flex min-h-96 flex-col items-center justify-center text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CalendarCheck2 className="size-7" />
                </span>
                <h2 className="mt-5 text-2xl font-semibold text-gray-950">
                  Reunião agendada
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
                  O horário foi reservado e seu contato entrou no processo
                  comercial da agência.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-gray-950">
                  Seus dados e horário
                </h2>
                {query.error && (
                  <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {query.error}
                  </p>
                )}
                <form action={bookMeeting} className="mt-6 space-y-4">
                  <input type="hidden" name="slug" value={profile.slug} />
                  <input
                    type="hidden"
                    name="idempotencyKey"
                    value={crypto.randomUUID()}
                  />
                  <div className="absolute -left-[9999px]" aria-hidden="true">
                    <label htmlFor="website">Site</label>
                    <input
                      id="website"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>
                  <Field
                    label="Nome"
                    name="name"
                    autoComplete="name"
                    required
                  />
                  <Field
                    label="E-mail"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Telefone" name="phone" autoComplete="tel" />
                    <Field label="Empresa" name="company" />
                  </div>
                  <div className="grid grid-cols-[1fr_120px] gap-3">
                    <Field
                      label="Data e hora"
                      name="startsAt"
                      type="datetime-local"
                      required
                    />
                    <div>
                      <Label htmlFor="utcOffset">UTC</Label>
                      <Select
                        id="utcOffset"
                        name="utcOffset"
                        defaultValue="-03:00"
                      >
                        {[
                          "-05:00",
                          "-04:00",
                          "-03:00",
                          "-02:00",
                          "+00:00",
                          "+01:00",
                        ].map((offset) => (
                          <option key={offset}>{offset}</option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs leading-5 text-gray-400">
                    A disponibilidade e conflitos serão conferidos novamente ao
                    confirmar.
                  </p>
                  <button className="h-11 w-full rounded-lg bg-gray-950 text-sm font-medium text-white hover:bg-gray-800">
                    Confirmar reunião
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
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
