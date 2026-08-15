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
