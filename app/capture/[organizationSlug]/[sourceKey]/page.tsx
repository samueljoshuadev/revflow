import { notFound } from "next/navigation";

import { Brand } from "@/components/brand";
import { PublicLeadForm } from "@/components/leads/public-lead-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Contato comercial" };

export default async function CapturePage({
  params,
}: {
  params: Promise<{ organizationSlug: string; sourceKey: string }>;
}) {
  const { organizationSlug, sourceKey } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_public_lead_capture_profile",
    { p_organization_slug: organizationSlug, p_source_key: sourceKey },
  );
  if (error || !data || typeof data !== "object" || Array.isArray(data))
    notFound();
  const organizationName =
    typeof data.organization_name === "string"
      ? data.organization_name
      : "Equipe comercial";
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(124,92,255,0.10),transparent_34%),#f8f9fc] px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex justify-center">
          <Brand />
        </div>
        <section className="rounded-3xl border border-white bg-white p-6 shadow-[0_24px_80px_rgba(31,35,64,0.10)] sm:p-8">
          <p className="text-xs font-semibold tracking-[0.14em] text-brand uppercase">
            Contato comercial
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-gray-950">
            Fale com {organizationName}
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            Conte brevemente o que precisa. Seus dados entram diretamente no
            fluxo comercial da equipe.
          </p>
          <div className="mt-7">
            <PublicLeadForm
              organizationSlug={organizationSlug}
              sourceKey={sourceKey}
            />
          </div>
        </section>
        <p className="mt-5 text-center text-[11px] text-gray-400">
          Formulário protegido pelo RevFlow
        </p>
      </div>
    </main>
  );
}
