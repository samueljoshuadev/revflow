import type {
  IncomeType,
  MaritalStatus,
  PropertyProposalStatus,
  ProposalDocumentType,
  ProposalPartyRole,
} from "@/types/database";

export const proposalStatusLabels: Record<PropertyProposalStatus, string> = {
  draft: "Rascunho",
  queued: "Na fila",
  in_review: "Em análise",
  countered: "Contraproposta",
  approved: "Aprovada",
  rejected: "Recusada",
  expired: "Expirada",
  cancelled: "Cancelada",
};

export const proposalStatusStyles: Record<PropertyProposalStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  queued: "bg-sky-50 text-sky-700",
  in_review: "bg-amber-50 text-amber-800",
  countered: "bg-violet-50 text-violet-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
  expired: "bg-gray-100 text-gray-500",
  cancelled: "bg-gray-100 text-gray-500",
};

export const partyRoleLabels: Record<ProposalPartyRole, string> = {
  buyer: "Comprador",
  spouse: "Cônjuge / companheiro(a)",
  co_buyer: "Co-comprador",
};

export const maritalStatusLabels: Record<MaritalStatus, string> = {
  single: "Solteiro(a)",
  married: "Casado(a)",
  stable_union: "União estável",
  divorced: "Divorciado(a)",
  widowed: "Viúvo(a)",
};

export const incomeTypeLabels: Record<IncomeType, string> = {
  clt: "CLT (holerite)",
  pro_labore: "Sócio / empresário (pró-labore)",
  self_employed: "Autônomo",
  retired: "Aposentado(a) / pensionista",
  other: "Outra",
  none: "Sem renda",
};

export const documentTypeLabels: Record<ProposalDocumentType, string> = {
  identity: "RG ou CNH",
  proof_of_residence: "Comprovante de residência",
  civil_status_certificate: "Certidão de nascimento ou casamento",
  income_proof: "Comprovante de renda",
  other: "Outro documento",
};

/** Nome específico do comprovante de renda conforme o tipo de renda. */
export function incomeProofLabel(incomeType: IncomeType | null) {
  switch (incomeType) {
    case "clt":
      return "Holerite (últimos 3 meses)";
    case "pro_labore":
      return "Pró-labore / contrato social";
    case "self_employed":
      return "Declaração de IR ou extratos";
    case "retired":
      return "Extrato do benefício";
    default:
      return documentTypeLabels.income_proof;
  }
}

/** Certidão esperada conforme o estado civil. */
export function civilCertificateLabel(maritalStatus: MaritalStatus | null) {
  switch (maritalStatus) {
    case "single":
      return "Certidão de nascimento";
    case "married":
      return "Certidão de casamento";
    case "stable_union":
      return "Declaração de união estável";
    case "divorced":
      return "Certidão de casamento com averbação do divórcio";
    case "widowed":
      return "Certidão de casamento e de óbito";
    default:
      return documentTypeLabels.civil_status_certificate;
  }
}

export type PartyForRequirements = {
  id: string;
  full_name: string;
  role: ProposalPartyRole;
  marital_status: MaritalStatus | null;
  income_type: IncomeType | null;
};

export type MissingRequirement = {
  code: string;
  partyId: string | null;
  label: string;
};

const fieldLabels: Record<string, string> = {
  cpf: "CPF",
  marital_status: "estado civil",
  income_type: "tipo de renda",
  phone: "telefone",
};

/**
 * Traduz os códigos devolvidos por `get_proposal_missing_requirements` (fonte
 * única de verdade no banco) em mensagens para o corretor.
 */
export function describeMissingRequirements(
  codes: string[],
  parties: PartyForRequirements[],
): MissingRequirement[] {
  const partyMap = new Map(parties.map((party) => [party.id, party]));
  return codes.map((code) => {
    if (code === "buyer_missing") {
      return { code, partyId: null, label: "Cadastre o comprador principal." };
    }
    if (code === "spouse_missing") {
      return {
        code,
        partyId: null,
        label: "Comprador casado ou em união estável: cadastre o cônjuge/companheiro(a).",
      };
    }
    const [partyId, kind, detail] = code.split(":");
    const party = partyMap.get(partyId);
    const who = party ? party.full_name : "Participante";
    if (kind === "doc") {
      const documentType = detail as ProposalDocumentType;
      let document: string = documentTypeLabels[documentType] ?? detail;
      if (documentType === "income_proof") document = incomeProofLabel(party?.income_type ?? null);
      if (documentType === "civil_status_certificate") {
        document = civilCertificateLabel(party?.marital_status ?? null);
      }
      return { code, partyId: partyId ?? null, label: `${who}: enviar ${document}.` };
    }
    return {
      code,
      partyId: partyId ?? null,
      label: `${who}: preencher ${fieldLabels[kind] ?? kind}.`,
    };
  });
}

/** Status em que a proposta ainda pode ser editada pelo corretor. */
export function isProposalEditable(status: PropertyProposalStatus) {
  return status === "draft" || status === "countered";
}

export function isProposalOpen(status: PropertyProposalStatus) {
  return ["draft", "queued", "in_review", "countered"].includes(status);
}

/** "faltam 5 h", "venceu há 2 h". */
export function describeDeadline(dueAt: string | null, now = new Date()) {
  if (!dueAt) return null;
  const diffMinutes = Math.round((new Date(dueAt).getTime() - now.getTime()) / 60_000);
  const abs = Math.abs(diffMinutes);
  const amount =
    abs < 60 ? `${abs} min` : abs < 48 * 60 ? `${Math.round(abs / 60)} h` : `${Math.round(abs / 1440)} dias`;
  return { overdue: diffMinutes < 0, text: diffMinutes < 0 ? `venceu há ${amount}` : `faltam ${amount}` };
}

/** Normaliza CPF para 11 dígitos e valida os dígitos verificadores. */
export function normalizeCpf(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return null;
  const check = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(digits[index]) * (length + 1 - index);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(digits[9]) && check(10) === Number(digits[10]) ? digits : null;
}

export function formatCpf(value: string | null) {
  if (!value || value.length !== 11) return value ?? "";
  return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
}
