import { Copy, MailPlus, ShieldCheck, Trash2, UserRound } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Input, Label, Select } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationMembers } from "@/services/organizations";
import { requireWorkspace } from "@/services/workspace";

import {
  createInvitation,
  removeMember,
  revokeInvitation,
  updateMemberRole,
} from "./actions";

export const metadata = { title: "Equipe" };
const roleLabels = {
  owner: "Proprietário",
  admin: "Administrador",
  manager: "Gestor",
  member: "Vendedor",
  viewer: "Leitura",
};

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; invite?: string }>;
}) {
  const params = await searchParams;
  const { user, organization } = await requireWorkspace();
  const supabase = await createClient();
  const [members, { data: invitations, error }] = await Promise.all([
    getOrganizationMembers(organization.id),
    supabase
      .from("organization_invitations")
      .select("id, email, role, expires_at, created_at")
      .eq("organization_id", organization.id)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
  ]);
  if (error) throw error;
  const canAdmin = ["owner", "admin"].includes(organization.role);

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <PageHeader
        eyebrow="Acesso ao workspace"
        title="Equipe e permissões"
        description={`${members.length} membros em ${organization.name}`}
      />
      {params.error && (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {params.error}
        </p>
      )}
      {params.invite && (
        <div className="mt-6 rounded-xl border border-violet-200 bg-violet-50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-violet-900">
            <Copy className="size-4" /> Link de convite criado
          </div>
          <p className="mt-2 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-violet-700">{`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}${params.invite}`}</p>
          <p className="mt-2 text-xs text-violet-600">
            Envie este link somente para a pessoa convidada. Ele expira em 7
            dias.
          </p>
        </div>
      )}

      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Membros</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {members.map((member) => (
              <article
                key={member.user_id}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <UserRound className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.profile?.full_name ??
                        (member.user_id === user.id ? "Você" : "Membro")}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {roleLabels[member.role]}
                    </p>
                  </div>
                </div>
                {canAdmin && (
                  <div className="flex gap-2">
                    <form action={updateMemberRole} className="flex gap-2">
                      <input
                        type="hidden"
                        name="userId"
                        value={member.user_id}
                      />
                      <Select
                        name="role"
                        defaultValue={member.role}
                        className="h-8 w-36 text-xs"
                      >
                        <option value="owner">Proprietário</option>
                        <option value="admin">Administrador</option>
                        <option value="manager">Gestor</option>
                        <option value="member">Vendedor</option>
                        <option value="viewer">Leitura</option>
                      </Select>
                      <button className="h-8 rounded-lg border border-gray-200 px-2.5 text-xs text-gray-600">
                        Salvar
                      </button>
                    </form>
                    {member.user_id !== user.id && (
                      <form action={removeMember}>
                        <input
                          type="hidden"
                          name="userId"
                          value={member.user_id}
                        />
                        <button
                          aria-label="Remover membro"
                          className="flex size-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        {canAdmin && (
          <aside className="space-y-6">
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2">
                <MailPlus className="size-4 text-brand" />
                <h2 className="text-sm font-semibold text-gray-900">
                  Convidar pessoa
                </h2>
              </div>
              <form action={createInvitation} className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div>
                  <Label htmlFor="role">Permissão</Label>
                  <Select id="role" name="role" defaultValue="member">
                    <option value="admin">Administrador</option>
                    <option value="manager">Gestor</option>
                    <option value="member">Vendedor</option>
                    <option value="viewer">Leitura</option>
                  </Select>
                </div>
                <button className="h-9 w-full rounded-lg bg-gray-950 text-xs font-medium text-white">
                  Gerar convite
                </button>
              </form>
            </section>
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600" />
                <h2 className="text-sm font-semibold text-gray-900">
                  Convites pendentes
                </h2>
              </div>
              <div className="mt-4 space-y-3">
                {invitations.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    Nenhum convite pendente.
                  </p>
                ) : (
                  invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-gray-700">
                          {invitation.email}
                        </p>
                        <p className="mt-1 text-[10px] text-gray-400">
                          {roleLabels[invitation.role]} · expira{" "}
                          {new Intl.DateTimeFormat("pt-BR").format(
                            new Date(invitation.expires_at),
                          )}
                        </p>
                      </div>
                      <form action={revokeInvitation}>
                        <input
                          type="hidden"
                          name="invitationId"
                          value={invitation.id}
                        />
                        <button className="text-[10px] text-red-600">
                          Revogar
                        </button>
                      </form>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        )}
      </div>
    </div>
  );
}
