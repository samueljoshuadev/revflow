import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { LeadImportWizard } from "@/components/leads/lead-import-wizard";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/services/workspace";

export const metadata = { title: "Importar leads" };

export default async function LeadImportPage() {
  const { organization } = await requireWorkspace();
  const supabase = await createClient();
  const [servicesResult, membersResult] = await Promise.all([
    supabase
      .from("services")
      .select("id, name")
      .eq("organization_id", organization.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organization.id)
      .limit(200),
  ]);
  if (servicesResult.error || membersResult.error) {
    throw servicesResult.error ?? membersResult.error;
  }
  const userIds = (membersResult.data ?? []).map((item) => item.user_id);
  const profilesResult = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [], error: null };
  if (profilesResult.error) throw profilesResult.error;
  const profileNames = new Map(
    (profilesResult.data ?? []).map((profile) => [
      profile.id,
      profile.full_name,
    ]),
  );

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <Link
        href="/leads"
        className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-950"
      >
        <ArrowLeft className="size-3.5" /> Voltar para leads
      </Link>
      <PageHeader
        eyebrow="Entrada de dados"
        title="Importar leads"
        description="Traga sua base real com prévia, validação e proteção contra duplicidades."
      />
      <div className="mt-7">
        <LeadImportWizard
          services={servicesResult.data ?? []}
          members={(membersResult.data ?? []).map((member) => ({
            id: member.user_id,
            name: profileNames.get(member.user_id) || "Membro da equipe",
          }))}
        />
      </div>
    </div>
  );
}
