import { Building, Copy, MailPlus, Network, ShieldCheck, Trash2, UserRound } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Input, Label, Select } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationMembers } from "@/services/organizations";
import { listPartnerAgencies } from "@/services/proposals";
import { requireWorkspace } from "@/services/workspace";

import {
  archivePartnerAgency,
  createInvitation,
  createPartnerAgency,
  removeMember,
  revokeInvitation,
  setMemberReportsTo,
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
  searchParams: Promise<{ error?: string; invite?: string; message?: string }>;
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
  const isRealEstate = organization.vertical === "real_estate";
  const partners = isRealEstate ? await listPartnerAgencies(organization.id) : [];
  const memberName = (userId: string | null) => {
    const found = members.find((item) => item.user_id === userId);
    return found ? (found.profile?.full_name ?? "Membro") : null;
  };

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
      {params.message && (
        <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {params.message}
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
                      {isRealEstate && member.reports_to_user_id && ` · responde a ${memberName(member.reports_to_user_id)}`}
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
                        {organization.role === "owner" && (
                          <option value="owner">Proprietário</option>
                        )}
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

      {isRealEstate && canAdmin && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><Network className="size-4 text-brand-dark" /> Hierarquia comercial</h2>
            <p className="mt-1 text-xs leading-5 text-gray-500">
              Defina a quem cada pessoa responde (corretor → gerente → diretor). Ao criar uma proposta, gerente e diretor são vinculados automaticamente e passam a acompanhá-la.
            </p>
            <ul className="mt-4 divide-y divide-gray-100">
              {members.map((member) => (
                <li key={member.user_id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm text-gray-800">{member.profile?.full_name ?? "Membro"}</span>
                  <form action={setMemberReportsTo} className="flex gap-2">
                    <input type="hidden" name="userId" value={member.user_id} />
                    <Select name="reportsToUserId" defaultValue={member.reports_to_user_id ?? ""} aria-label={`Responsável de ${member.profile?.full_name ?? "membro"}`} className="h-8 w-48 text-xs">
                      <option value="">Não responde a ninguém</option>
                      {members
                        .filter((candidate) => candidate.user_id !== member.user_id)
                        .map((candidate) => (
                          <option key={candidate.user_id} value={candidate.user_id}>{candidate.profile?.full_name ?? "Membro"}</option>
                        ))}
                    </Select>
                    <button className="h-8 rounded-lg border border-gray-200 px-2.5 text-xs text-gray-600">Salvar</button>
                  </form>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><Building className="size-4 text-brand-dark" /> Imobiliárias parceiras</h2>
            <p className="mt-1 text-xs leading-5 text-gray-500">Vinculadas às propostas que vêm de fora da equipe própria.</p>
            {partners.length > 0 && (
              <ul className="mt-4 space-y-2">
                {partners.map((partner) => (
                  <li key={partner.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-gray-900">{partner.name}</span>
                      <span className="block truncate text-[11px] text-gray-500">{[partner.creci && `CRECI ${partner.creci}`, partner.contact_name, partner.phone].filter(Boolean).join(" · ")}</span>
                    </span>
                    <form action={archivePartnerAgency}>
                      <input type="hidden" name="partnerId" value={partner.id} />
                      <button aria-label={`Arquivar ${partner.name}`} className="flex size-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4" /></button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <form action={createPartnerAgency} className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="partner-name">Nome da imobiliária</Label>
                <Input id="partner-name" name="name" required minLength={2} maxLength={180} />
              </div>
              <div><Label htmlFor="partner-document">CNPJ</Label><Input id="partner-document" name="document" inputMode="numeric" maxLength={18} /></div>
              <div><Label htmlFor="partner-creci">CRECI</Label><Input id="partner-creci" name="creci" maxLength={40} /></div>
              <div><Label htmlFor="partner-contact">Contato</Label><Input id="partner-contact" name="contactName" maxLength={180} /></div>
              <div><Label htmlFor="partner-phone">Telefone</Label><Input id="partner-phone" name="phone" type="tel" maxLength={30} /></div>
              <div className="sm:col-span-2"><Label htmlFor="partner-email">E-mail</Label><Input id="partner-email" name="email" type="email" maxLength={254} /></div>
              <div className="flex justify-end sm:col-span-2">
                <button className="h-9 rounded-lg bg-brand px-4 text-xs font-semibold text-[#172033] hover:bg-brand-dark hover:text-white">Cadastrar imobiliária</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
