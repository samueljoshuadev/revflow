import { CheckCircle2, CircleDashed, FileText, Trash2, Upload } from "lucide-react";

import { Field } from "@/components/developments/development-form";
import { Label, Select } from "@/components/ui/field";
import {
  civilCertificateLabel,
  documentTypeLabels,
  formatCpf,
  incomeProofLabel,
  incomeTypeLabels,
  maritalStatusLabels,
  partyRoleLabels,
} from "@/lib/proposals";
import type { Tables } from "@/types/database";

type Party = Tables<"proposal_parties">;
type ProposalDocument = Tables<"proposal_documents"> & { signed_url: string | null };
type Action = (formData: FormData) => void | Promise<void>;

/** Documentos exigidos do participante, na mesma regra de `get_proposal_missing_requirements`. */
function requiredDocuments(party: Party) {
  const items: Array<{ type: Tables<"proposal_documents">["document_type"]; label: string }> = [
    { type: "identity", label: documentTypeLabels.identity },
    { type: "civil_status_certificate", label: civilCertificateLabel(party.marital_status) },
  ];
  if ((party.income_type ?? "none") !== "none") {
    items.push({ type: "income_proof", label: incomeProofLabel(party.income_type) });
  }
  if (party.role === "buyer") {
    items.push({ type: "proof_of_residence", label: documentTypeLabels.proof_of_residence });
  }
  return items;
}

export function PartyCard({
  proposalId,
  party,
  documents,
  editable,
  saveAction,
  removeAction,
  uploadAction,
  removeDocumentAction,
}: {
  proposalId: string;
  party: Party;
  documents: ProposalDocument[];
  editable: boolean;
  saveAction: Action;
  removeAction: Action;
  uploadAction: Action;
  removeDocumentAction: Action;
}) {
  const required = requiredDocuments(party);
  const extras = documents.filter((document) => !required.some((item) => item.type === document.document_type));

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] text-brand-dark uppercase">{partyRoleLabels[party.role]}</p>
          <h3 className="mt-1 text-base font-semibold text-gray-950">{party.full_name}</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {[party.cpf ? `CPF ${formatCpf(party.cpf)}` : null, party.marital_status ? maritalStatusLabels[party.marital_status] : null, party.income_type ? incomeTypeLabels[party.income_type] : null]
              .filter(Boolean)
              .join(" · ") || "Dados pessoais pendentes"}
          </p>
        </div>
        {editable && party.role !== "buyer" && (
          <form action={removeAction}>
            <input type="hidden" name="proposalId" value={proposalId} />
            <input type="hidden" name="partyId" value={party.id} />
            <button className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remover ${party.full_name}`}>
              <Trash2 className="size-4" />
            </button>
          </form>
        )}
      </div>

      <h4 className="mt-5 text-xs font-semibold text-gray-500">Documentos</h4>
      <ul className="mt-2 space-y-2">
        {required.map((item) => {
          const sent = documents.filter((document) => document.document_type === item.type);
          return (
            <li key={item.type} className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-xs font-medium text-gray-800">
                  {sent.length ? <CheckCircle2 className="size-4 text-emerald-600" /> : <CircleDashed className="size-4 text-amber-500" />}
                  {item.label}
                </span>
                {editable && (
                  <form action={uploadAction} className="flex items-center gap-2">
                    <input type="hidden" name="proposalId" value={proposalId} />
                    <input type="hidden" name="partyId" value={party.id} />
                    <input type="hidden" name="documentType" value={item.type} />
                    <input
                      type="file"
                      name="file"
                      required
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      aria-label={`Arquivo: ${item.label}`}
                      className="w-40 text-[11px] text-gray-500 file:mr-2 file:rounded-md file:border-0 file:bg-white file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-gray-700 file:shadow-xs"
                    />
                    <button className="inline-flex h-7 items-center gap-1 rounded-md bg-[#172033] px-2.5 text-[11px] font-semibold text-white hover:bg-black">
                      <Upload className="size-3" /> Enviar
                    </button>
                  </form>
                )}
              </div>
              {sent.length > 0 && (
                <DocumentLinks documents={sent} proposalId={proposalId} editable={editable} removeAction={removeDocumentAction} />
              )}
            </li>
          );
        })}
        {extras.length > 0 && (
          <li className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2.5">
            <span className="text-xs font-medium text-gray-800">{documentTypeLabels.other}</span>
            <DocumentLinks documents={extras} proposalId={proposalId} editable={editable} removeAction={removeDocumentAction} />
          </li>
        )}
      </ul>
      {editable && <p className="mt-2 text-[10px] text-gray-400">PDF, JPG, PNG ou WebP de até 4 MB. Os arquivos ficam privados.</p>}

      {editable && (
        <details className="group mt-4 rounded-lg border border-gray-200">
          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-gray-700 group-open:border-b group-open:border-gray-200">
            Editar dados de {party.full_name.split(" ")[0]}
          </summary>
          <PartyFields proposalId={proposalId} party={party} action={saveAction} />
        </details>
      )}
    </section>
  );
}

function DocumentLinks({
  documents,
  proposalId,
  editable,
  removeAction,
}: {
  documents: ProposalDocument[];
  proposalId: string;
  editable: boolean;
  removeAction: Action;
}) {
  return (
    <ul className="mt-2 space-y-1 pl-6">
      {documents.map((document) => (
        <li key={document.id} className="flex items-center justify-between gap-2 text-[11px]">
          {document.signed_url ? (
            <a href={document.signed_url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-1.5 text-brand-dark hover:underline">
              <FileText className="size-3.5 shrink-0" /><span className="truncate">{document.file_name}</span>
            </a>
          ) : (
            <span className="flex min-w-0 items-center gap-1.5 text-gray-500"><FileText className="size-3.5 shrink-0" /><span className="truncate">{document.file_name}</span></span>
          )}
          {editable && (
            <form action={removeAction}>
              <input type="hidden" name="proposalId" value={proposalId} />
              <input type="hidden" name="documentId" value={document.id} />
              <button className="text-gray-400 hover:text-red-600" aria-label={`Remover ${document.file_name}`}><Trash2 className="size-3.5" /></button>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Formulário de dados do participante; sem `party` cria um novo (cônjuge/co-comprador). */
export function PartyFields({
  proposalId,
  party,
  action,
  newRole,
}: {
  proposalId: string;
  party?: Party;
  action: Action;
  newRole?: "spouse" | "co_buyer";
}) {
  const prefix = party?.id ?? newRole ?? "new";
  return (
    <form action={action} className="grid gap-3 p-3 sm:grid-cols-2">
      <input type="hidden" name="proposalId" value={proposalId} />
      {party && <input type="hidden" name="partyId" value={party.id} />}
      <input type="hidden" name="role" value={party?.role ?? newRole ?? "co_buyer"} />
      <div className="sm:col-span-2"><Field label="Nome completo" name="fullName" id={`${prefix}-name`} defaultValue={party?.full_name} required minLength={2} maxLength={180} /></div>
      <Field label="CPF" name="cpf" id={`${prefix}-cpf`} inputMode="numeric" defaultValue={formatCpf(party?.cpf ?? null)} placeholder="000.000.000-00" maxLength={14} />
      <Field label="RG" name="rg" id={`${prefix}-rg`} defaultValue={party?.rg ?? ""} maxLength={30} />
      <Field label="Data de nascimento" name="birthDate" id={`${prefix}-birth`} type="date" defaultValue={party?.birth_date ?? ""} />
      <div>
        <Label htmlFor={`${prefix}-marital`}>Estado civil</Label>
        <Select id={`${prefix}-marital`} name="maritalStatus" defaultValue={party?.marital_status ?? ""}>
          <option value="">Selecione</option>
          {Object.entries(maritalStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </div>
      <Field label="Telefone / WhatsApp" name="phone" id={`${prefix}-phone`} type="tel" defaultValue={party?.phone ?? ""} maxLength={30} />
      <Field label="E-mail" name="email" id={`${prefix}-email`} type="email" defaultValue={party?.email ?? ""} maxLength={254} />
      <div>
        <Label htmlFor={`${prefix}-income-type`}>Tipo de renda</Label>
        <Select id={`${prefix}-income-type`} name="incomeType" defaultValue={party?.income_type ?? ""}>
          <option value="">Selecione</option>
          {Object.entries(incomeTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </div>
      <Field label="Renda bruta mensal (R$)" name="grossMonthlyIncome" id={`${prefix}-income`} type="number" step="0.01" min={0} defaultValue={party?.gross_monthly_income ?? ""} />
      <Field label="Profissão" name="occupation" id={`${prefix}-occupation`} defaultValue={party?.occupation ?? ""} maxLength={120} />
      <div className="sm:col-span-2"><Field label="Endereço" name="address" id={`${prefix}-address`} defaultValue={party?.address ?? ""} maxLength={300} /></div>
      <div className="flex justify-end sm:col-span-2">
        <button className="h-9 rounded-lg bg-brand px-4 text-xs font-semibold text-[#172033] hover:bg-brand-dark hover:text-white">
          {party ? "Salvar dados" : "Adicionar participante"}
        </button>
      </div>
    </form>
  );
}
