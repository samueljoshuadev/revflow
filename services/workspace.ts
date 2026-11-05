import "server-only";

import { redirect } from "next/navigation";

import { requireUser } from "@/services/auth";
import { getCurrentOrganization } from "@/services/organizations";

export async function requireWorkspace() {
  const user = await requireUser();
  const organization = await getCurrentOrganization(user.id);
  if (!organization) redirect("/onboarding");
  return { user, organization };
}

export async function requireRealEstateWorkspace() {
  const workspace = await requireWorkspace();
  if (workspace.organization.vertical !== "real_estate") {
    redirect("/dashboard");
  }
  return workspace;
}

/** Workspace imobiliário com papel owner/admin; usado para editar o espelho. */
export async function requireRealEstateAdmin(redirectTo = "/developments") {
  const workspace = await requireRealEstateWorkspace();
  if (!["owner", "admin"].includes(workspace.organization.role)) {
    redirect(`${redirectTo}?error=Apenas+administradores+podem+alterar+o+espelho.`);
  }
  return workspace;
}
