import "server-only";

import { isStructurallyValidCpf, normalizeCpf } from "@atlas/kernel";

import {
  listAllAirtableRecords,
  updateAirtableRecord,
} from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

const REVIEW_TABLE_ID = "tblgtBw4wOvG4utaS";

type ProposalKey =
  "legalName" | "birthDate" | "motherName" | "cpf" | "identityDocument";

export type ProposalValues = Partial<Record<ProposalKey, string>>;

type ProposalReviewFields = {
  "ID Revisão"?: string;
  Situação?: string;
  Indivíduo?: string[];
  "Campos para Saneamento"?: string;
  "Proposta de Correção"?: string;
  "Situação da Proposta"?: string;
  "Proponente Técnico"?: string;
  "Proposta em"?: string;
  "Hash da Versão de Origem"?: string;
  "Aprovador Técnico"?: string;
  "Justificativa da Decisão da Proposta"?: string;
  "Proposta Decidida em"?: string;
  "Situação da Execução"?: string;
  "Executor Técnico"?: string;
  "Executada em"?: string;
  "Situação da Reversão"?: string;
  "Solicitante da Reversão"?: string;
  "Motivo da Reversão"?: string;
  "Reversão Solicitada em"?: string;
  "Aprovador da Reversão"?: string;
  "Justificativa da Reversão"?: string;
  "Reversão Decidida em"?: string;
  "Executor da Reversão"?: string;
  "Revertida em"?: string;
};

type IndividualFields = {
  "Nome Completo"?: string;
  "Data de Nascimento"?: string;
  Mãe?: string;
  CPF?: string;
  "Registro Geral"?: string;
};

export type ProtectedCorrectionProposalContext = {
  reviewId: string;
  allowedFields: ProposalKey[];
  issues: string[];
  proposalStatus: string | null;
  current: ProposalValues;
  proposed: ProposalValues | null;
  proposedAt: string | null;
  proposerId: string | null;
  approverId: string | null;
  decisionReason: string | null;
  decidedAt: string | null;
  executionStatus: string | null;
  executorId: string | null;
  executedAt: string | null;
  reversalStatus: string | null;
  reversalRequesterId: string | null;
  reversalReason: string | null;
  reversalRequestedAt: string | null;
  reversalApproverId: string | null;
  reversalDecisionReason: string | null;
  reversalDecidedAt: string | null;
  reversalExecutorId: string | null;
  revertedAt: string | null;
};

function maskDocument(value: string | undefined): string {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits ? `••••••${digits.slice(-2)}` : "Não informado";
}

function protectedValues(fields: IndividualFields): ProposalValues {
  return {
    legalName: fields["Nome Completo"]?.trim() || "Não informado",
    birthDate: fields["Data de Nascimento"]?.trim() || "Não informado",
    motherName: fields.Mãe?.trim() || "Não informado",
    cpf: maskDocument(fields.CPF),
    identityDocument: maskDocument(fields["Registro Geral"]),
  };
}

function protectedProposal(values: ProposalValues): ProposalValues {
  return {
    ...values,
    cpf: values.cpf ? maskDocument(values.cpf) : undefined,
    identityDocument: values.identityDocument
      ? maskDocument(values.identityDocument)
      : undefined,
  };
}

function allowedFieldsFromIssues(issues: string[]): ProposalKey[] {
  const allowed = new Set<ProposalKey>();
  for (const issue of issues) {
    if (issue === "Nome completo ausente") allowed.add("legalName");
    if (issue === "Data de nascimento ausente") allowed.add("birthDate");
    if (issue === "Filiação materna ausente") allowed.add("motherName");
    if (issue === "CPF ausente" || issue === "CPF estruturalmente inválido")
      allowed.add("cpf");
    if (issue === "RG ausente") allowed.add("identityDocument");
  }
  return Array.from(allowed);
}

function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function validateProposal(
  values: ProposalValues,
  allowed: ProposalKey[],
): ProposalValues {
  const result: ProposalValues = {};
  for (const [key, rawValue] of Object.entries(values) as Array<
    [ProposalKey, string]
  >) {
    if (!allowed.includes(key)) {
      throw new Error(
        "A proposta contém um campo que não pertence às pendências desta solicitação.",
      );
    }
    if (typeof rawValue !== "string")
      throw new Error("Todos os valores propostos devem ser textuais.");
    const value = rawValue.trim();
    if (!value) continue;

    if ((key === "legalName" || key === "motherName") && value.length < 3) {
      throw new Error("Nome e filiação devem possuir pelo menos 3 caracteres.");
    }
    if (key === "birthDate" && !validIsoDate(value)) {
      throw new Error(
        "A data de nascimento deve estar no formato AAAA-MM-DD e ser válida.",
      );
    }
    if (key === "cpf") {
      const cpf = normalizeCpf(value);
      if (!cpf || !isStructurallyValidCpf(cpf)) {
        throw new Error("O CPF proposto não é estruturalmente válido.");
      }
      result.cpf = cpf;
      continue;
    }
    if (key === "identityDocument" && (value.length < 3 || value.length > 30)) {
      throw new Error(
        "O documento de identidade deve possuir entre 3 e 30 caracteres.",
      );
    }
    result[key] = value;
  }

  if (Object.keys(result).length === 0) {
    throw new Error("Informe ao menos um valor para compor a proposta.");
  }
  return result;
}

async function sourceHash(fields: IndividualFields): Promise<string> {
  const stable = JSON.stringify({
    legalName: fields["Nome Completo"]?.trim() ?? null,
    birthDate: fields["Data de Nascimento"]?.trim() ?? null,
    motherName: fields.Mãe?.trim() ?? null,
    cpf: normalizeCpf(fields.CPF) ?? null,
    identityDocument: fields["Registro Geral"]?.trim() ?? null,
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(stable),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function loadContext(reviewId: string) {
  const configuration = getAirtableConfiguration();
  const reviews = await listAllAirtableRecords<ProposalReviewFields>(
    REVIEW_TABLE_ID,
    {
      baseId: configuration.individualsPreviewBaseId,
      fields: [
        "ID Revisão",
        "Situação",
        "Indivíduo",
        "Campos para Saneamento",
        "Proposta de Correção",
        "Situação da Proposta",
        "Proponente Técnico",
        "Proposta em",
        "Hash da Versão de Origem",
        "Aprovador Técnico",
        "Justificativa da Decisão da Proposta",
        "Proposta Decidida em",
        "Situação da Execução",
        "Executor Técnico",
        "Executada em",
        "Situação da Reversão",
        "Solicitante da Reversão",
        "Motivo da Reversão",
        "Reversão Solicitada em",
        "Aprovador da Reversão",
        "Justificativa da Reversão",
        "Reversão Decidida em",
        "Executor da Reversão",
        "Revertida em",
      ],
      filterByFormula: `{ID Revisão}='${reviewId.replace(/'/g, "\\'")}'`,
      maxRecords: 1,
    },
  );
  const review = reviews[0];
  const sourceRecordId = review?.fields.Indivíduo?.[0];
  if (!review || !sourceRecordId) {
    throw new Error(
      "A solicitação ou o vínculo com o cadastro não foi encontrado.",
    );
  }

  const individuals = await listAllAirtableRecords<IndividualFields>(
    configuration.individualsTableId,
    {
      baseId: configuration.individualsPreviewBaseId,
      fields: [
        "Nome Completo",
        "Data de Nascimento",
        "Mãe",
        "CPF",
        "Registro Geral",
      ],
      filterByFormula: `RECORD_ID()='${sourceRecordId.replace(/'/g, "\\'")}'`,
      maxRecords: 1,
    },
  );
  const individual = individuals[0];
  if (!individual) throw new Error("O cadastro vinculado não foi encontrado.");

  const issues =
    review.fields["Campos para Saneamento"]
      ?.split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean) ?? [];

  return {
    configuration,
    review,
    individual,
    issues,
    allowedFields: allowedFieldsFromIssues(issues),
  };
}

export async function getProtectedCorrectionProposalContext(
  reviewId: string,
): Promise<ProtectedCorrectionProposalContext> {
  const context = await loadContext(reviewId);
  let proposed: ProposalValues | null = null;
  const rawProposal = context.review.fields["Proposta de Correção"];
  if (rawProposal) {
    try {
      proposed = protectedProposal(JSON.parse(rawProposal) as ProposalValues);
    } catch {
      throw new Error("A proposta armazenada possui formato inválido.");
    }
  }

  return {
    reviewId,
    allowedFields: context.allowedFields,
    issues: context.issues,
    proposalStatus: context.review.fields["Situação da Proposta"] ?? null,
    current: protectedValues(context.individual.fields),
    proposed,
    proposedAt: context.review.fields["Proposta em"] ?? null,
    proposerId: context.review.fields["Proponente Técnico"]?.trim() || null,
    approverId: context.review.fields["Aprovador Técnico"]?.trim() || null,
    decisionReason:
      context.review.fields["Justificativa da Decisão da Proposta"]?.trim() ||
      null,
    decidedAt: context.review.fields["Proposta Decidida em"] ?? null,
    executionStatus: context.review.fields["Situação da Execução"] ?? null,
    executorId: context.review.fields["Executor Técnico"]?.trim() || null,
    executedAt: context.review.fields["Executada em"] ?? null,
    reversalStatus: context.review.fields["Situação da Reversão"] ?? null,
    reversalRequesterId:
      context.review.fields["Solicitante da Reversão"]?.trim() || null,
    reversalReason: context.review.fields["Motivo da Reversão"]?.trim() || null,
    reversalRequestedAt:
      context.review.fields["Reversão Solicitada em"] ?? null,
    reversalApproverId:
      context.review.fields["Aprovador da Reversão"]?.trim() || null,
    reversalDecisionReason:
      context.review.fields["Justificativa da Reversão"]?.trim() || null,
    reversalDecidedAt: context.review.fields["Reversão Decidida em"] ?? null,
    reversalExecutorId:
      context.review.fields["Executor da Reversão"]?.trim() || null,
    revertedAt: context.review.fields["Revertida em"] ?? null,
  };
}

export async function decideCorrectionProposal(input: {
  reviewId: string;
  decision: "approve" | "reject";
  reason: string;
  approverId: string;
  decidedAt: Date;
}): Promise<ProtectedCorrectionProposalContext> {
  const context = await loadContext(input.reviewId);
  const proposalStatus = context.review.fields["Situação da Proposta"];
  const proposerId = context.review.fields["Proponente Técnico"]?.trim();

  if (proposalStatus !== "Pendente de aprovação") {
    throw new Error("Somente propostas pendentes podem receber uma decisão.");
  }
  if (!proposerId) {
    throw new Error("A proposta não possui proponente identificado.");
  }
  if (proposerId === input.approverId) {
    throw new Error(
      "A mesma identidade não pode elaborar e decidir a proposta.",
    );
  }

  const reason = input.reason.trim();
  if (reason.length < 10 || reason.length > 1000) {
    throw new Error(
      "A justificativa da decisão deve possuir entre 10 e 1000 caracteres.",
    );
  }

  await updateAirtableRecord<ProposalReviewFields>(
    REVIEW_TABLE_ID,
    context.review.id,
    {
      "Situação da Proposta":
        input.decision === "approve" ? "Aprovada" : "Rejeitada",
      "Aprovador Técnico": input.approverId,
      "Justificativa da Decisão da Proposta": reason,
      "Proposta Decidida em": input.decidedAt.toISOString(),
    },
    { baseId: context.configuration.individualsPreviewBaseId },
  );

  return getProtectedCorrectionProposalContext(input.reviewId);
}

export async function saveCorrectionProposal(input: {
  reviewId: string;
  values: ProposalValues;
  proposerId: string;
  proposedAt: Date;
}): Promise<ProtectedCorrectionProposalContext> {
  const context = await loadContext(input.reviewId);
  if (context.review.fields.Situação !== "Concluída") {
    throw new Error(
      "O tratamento deve estar concluído antes da elaboração da proposta.",
    );
  }
  const proposalStatus = context.review.fields["Situação da Proposta"];
  if (proposalStatus && proposalStatus !== "Rejeitada") {
    throw new Error("Já existe uma proposta ativa para esta solicitação.");
  }

  const values = validateProposal(input.values, context.allowedFields);
  const hash = await sourceHash(context.individual.fields);

  await updateAirtableRecord<ProposalReviewFields>(
    REVIEW_TABLE_ID,
    context.review.id,
    {
      "Proposta de Correção": JSON.stringify(values),
      "Situação da Proposta": "Pendente de aprovação",
      "Proponente Técnico": input.proposerId,
      "Proposta em": input.proposedAt.toISOString(),
      "Hash da Versão de Origem": hash,
    },
    { baseId: context.configuration.individualsPreviewBaseId },
  );

  return getProtectedCorrectionProposalContext(input.reviewId);
}
