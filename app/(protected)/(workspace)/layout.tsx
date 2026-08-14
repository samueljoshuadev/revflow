import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/services/auth";
import {
  getCurrentOrganization,
  listUserOrganizations,
} from "@/services/organizations";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const organization = await getCurrentOrganization(user.id);
  if (!organization) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data: profile }, organizations] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle(),
    listUserOrganizations(user.id),
  ]);

  return (
    <AppShell
      organizationName={organization.name}
      organizationId={organization.id}
      organizationRole={organization.role}
      organizations={organizations}
      userName={profile?.full_name ?? ""}
      userEmail={user.email ?? ""}
    >
      {children}
    </AppShell>
  );
}
