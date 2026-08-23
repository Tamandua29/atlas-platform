import "server-only";

import { isStructurallyValidCpf, normalizeCpf } from "@atlas/kernel";

import {
  listAllAirtableRecords,
  updateAirtableRecord,
} from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";
import {
  assertDistinctActors,
  correctionExecutionDisposition,
} from "@/features/individuals/correction-workflow-policy";

const REVIEW_TABLE_ID = "tblgtBw4wOvG4utaS";
const CONFIRMATION_PHRASE = "APLICAR CORREÇÃO";

type ProposalKey =
  | "legalName"
  | "birthDate"
  | "motherName"
  | "cpf"
  | "identityDocument";

type ProposalValues = Partial<Record<ProposalKey, string>>;

type ExecutionReviewFields = {
  "ID Revisão"?: string;
  Indivíduo?: string[];
  "Proposta de Correção"?: string;
  "Situação da Proposta"?: string;
  "Proponente Técnico"?: string;
  "Aprovador Técnico"?: string;
  "Hash da Versão de Origem"?: string;
  "Situação da Execução"?: string;
  "Executor Técnico"?: string;
  "Executada em"?: string;
  "Snapshot Anterior à Aplicação"?: string;
  "Hash Após Aplicação"?: string;
  "Nota da Execução"?: string;
  "Erro da Execução"?: string;
  "Campos para Saneamento"?: string;
};

type IndividualFields = {
  "Nome Completo"?: string;
  "Data de Nascimento"?: string;
  Mãe?: string;
  CPF?: string;
  "Registro Geral"?: string;
};

export type CorrectionExecutionResult = {
  reviewId: string;
  executionStatus: string;
  proposalStatus: string;
  executorId: string;
  executedAt: string | null;
  sourceWritesPerformed: number;
  reconciled: boolean;
};

function stableValues(fields: IndividualFields) {
  return {
    legalName: fields["Nome Completo"]?.trim() ?? null,
    birthDate: fields["Data de Nascimento"]?.trim() ?? null,
    motherName: fields.Mãe?.trim() ?? null,
    cpf: normalizeCpf(fields.CPF) ?? null,
    identityDocument: fields["Registro Geral"]?.trim() ?? null,
  };
}

async function hashFields(fields: IndividualFields): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(stableValues(fields))),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function allowedProposalKeys(issues: string[]): ProposalKey[] {
  const allowed = new Set<ProposalKey>();
  for (const issue of issues) {
    if (issue === "Nome completo ausente") allowed.add("legalName");
    if (issue === "Data de nascimento ausente") allowed.add("birthDate");
    if (issue === "Filiação materna ausente") allowed.add("motherName");
    if (issue === "CPF ausente" || issue === "CPF estruturalmente inválido") allowed.add("cpf");
    if (issue === "RG ausente") allowed.add("identityDocument");
  }
  return Array.from(allowed);
}

function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseProposal(raw: string | undefined, issues: string[]): ProposalValues {
  if (!raw) throw new Error("A proposta aprovada não possui valores estruturados.");
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("A proposta aprovada possui formato inválido.");
  }

  const allowed = allowedProposalKeys(issues);
  const result: ProposalValues = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!allowed.includes(key as ProposalKey) || typeof value !== "string" || !value.trim()) {
      throw new Error("A proposta aprovada contém campo ou valor inválido.");
    }
    const proposalKey = key as ProposalKey;
    const normalized = value.trim();
    if ((proposalKey === "legalName" || proposalKey === "motherName") && normalized.length < 3) {
      throw new Error("A proposta aprovada contém nome ou filiação inválida.");
    }
    if (proposalKey === "birthDate" && !validIsoDate(normalized)) {
      throw new Error("A proposta aprovada contém data de nascimento inválida.");
    }
    if (proposalKey === "cpf") {
      const cpf = normalizeCpf(normalized);
      if (!cpf || !isStructurallyValidCpf(cpf)) {
        throw new Error("A proposta aprovada contém CPF estruturalmente inválido.");
      }
      result.cpf = cpf;
      continue;
    }
    if (proposalKey === "identityDocument" && (normalized.length < 3 || normalized.length > 30)) {
      throw new Error("A proposta aprovada contém documento de identidade inválido.");
    }
    result[proposalKey] = normalized;
  }
  if (Object.keys(result).length === 0) throw new Error("A proposta aprovada está vazia.");
  return result;
}

function applyProposal(
  current: IndividualFields,
  proposal: ProposalValues,
): IndividualFields {
  return {
    ...current,
    ...(proposal.legalName ? { "Nome Completo": proposal.legalName } : {}),
    ...(proposal.birthDate ? { "Data de Nascimento": proposal.birthDate } : {}),
    ...(proposal.motherName ? { Mãe: proposal.motherName } : {}),
    ...(proposal.cpf ? { CPF: proposal.cpf } : {}),
    ...(proposal.identityDocument ? { "Registro Geral": proposal.identityDocument } : {}),
  };
}

function proposalPatch(proposal: ProposalValues): Partial<IndividualFields> {
  return {
    ...(proposal.legalName ? { "Nome Completo": proposal.legalName } : {}),
    ...(proposal.birthDate ? { "Data de Nascimento": proposal.birthDate } : {}),
    ...(proposal.motherName ? { Mãe: proposal.motherName } : {}),
    ...(proposal.cpf ? { CPF: proposal.cpf } : {}),
    ...(proposal.identityDocument ? { "Registro Geral": proposal.identityDocument } : {}),
  };
}

async function loadExecutionContext(reviewId: string) {
  const configuration = getAirtableConfiguration();
  const reviews = await listAllAirtableRecords<ExecutionReviewFields>(
    REVIEW_TABLE_ID,
    {
      baseId: configuration.individualsPreviewBaseId,
      fields: [
        "ID Revisão",
        "Indivíduo",
        "Proposta de Correção",
        "Situação da Proposta",
        "Proponente Técnico",
        "Aprovador Técnico",
        "Hash da Versão de Origem",
        "Situação da Execução",
        "Executor Técnico",
        "Executada em",
        "Snapshot Anterior à Aplicação",
        "Hash Após Aplicação",
        "Nota da Execução",
        "Erro da Execução",
        "Campos para Saneamento",
      ],
      filterByFormula: `{ID Revisão}='${reviewId.replace(/'/g, "\\'")}'`,
      maxRecords: 1,
    },
  );
  const review = reviews[0];
  const sourceRecordId = review?.fields.Indivíduo?.[0];
  if (!review || !sourceRecordId) {
    throw new Error("A revisão aprovada ou o cadastro vinculado não foi encontrado.");
  }

  const individuals = await listAllAirtableRecords<IndividualFields>(
    configuration.individualsTableId,
    {
      baseId: configuration.individualsPreviewBaseId,
      fields: ["Nome Completo", "Data de Nascimento", "Mãe", "CPF", "Registro Geral"],
      filterByFormula: `RECORD_ID()='${sourceRecordId.replace(/'/g, "\\'")}'`,
      maxRecords: 1,
    },
  );
  const individual = individuals[0];
  if (!individual) throw new Error("O cadastro vinculado não foi encontrado.");

  return { configuration, review, individual };
}

async function finalizeExecution(input: {
  context: Awaited<ReturnType<typeof loadExecutionContext>>;
  executorId: string;
  executedAt: Date;
  reconciled: boolean;
}): Promise<CorrectionExecutionResult> {
  await updateAirtableRecord<ExecutionReviewFields>(
    REVIEW_TABLE_ID,
    input.context.review.id,
    {
      "Situação da Execução": "Aplicada",
      "Situação da Proposta": "Aplicada",
      "Executor Técnico": input.executorId,
      "Executada em": input.executedAt.toISOString(),
      "Erro da Execução": "",
    },
    { baseId: input.context.configuration.individualsPreviewBaseId },
  );

  return {
    reviewId: input.context.review.fields["ID Revisão"] ?? "",
    executionStatus: "Aplicada",
    proposalStatus: "Aplicada",
    executorId: input.executorId,
    executedAt: input.executedAt.toISOString(),
    sourceWritesPerformed: input.reconciled ? 0 : 1,
    reconciled: input.reconciled,
  };
}

export async function executeApprovedCorrection(input: {
  reviewId: string;
  executorId: string;
  confirmation: string;
  note: string;
  executedAt: Date;
}): Promise<CorrectionExecutionResult> {
  if (input.confirmation.trim() !== CONFIRMATION_PHRASE) {
    throw new Error(`Digite exatamente “${CONFIRMATION_PHRASE}” para confirmar a execução.`);
  }
  const note = input.note.trim();
  if (note.length < 10 || note.length > 1000) {
    throw new Error("A nota da execução deve possuir entre 10 e 1000 caracteres.");
  }

  const context = await loadExecutionContext(input.reviewId);
  const fields = context.review.fields;
  const proposerId = fields["Proponente Técnico"]?.trim();
  const approverId = fields["Aprovador Técnico"]?.trim();
  if (!proposerId || !approverId) {
    throw new Error("A proposta não possui segregação completa entre proponente e aprovador.");
  }
  assertDistinctActors([
    { id: proposerId, label: "proponente" },
    { id: approverId, label: "aprovador" },
    { id: input.executorId, label: "executor" },
  ]);
  if (fields["Situação da Execução"] === "Aplicada") {
    return {
      reviewId: input.reviewId,
      executionStatus: "Aplicada",
      proposalStatus: fields["Situação da Proposta"] ?? "Aplicada",
      executorId: fields["Executor Técnico"] ?? input.executorId,
      executedAt: fields["Executada em"] ?? null,
      sourceWritesPerformed: 0,
      reconciled: true,
    };
  }

  const issues = fields["Campos para Saneamento"]
    ?.split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean) ?? [];
  const proposal = parseProposal(fields["Proposta de Correção"], issues);
  const currentHash = await hashFields(context.individual.fields);
  const expectedSourceHash = fields["Hash da Versão de Origem"];
  const expectedAfterHash = fields["Hash Após Aplicação"];

  const disposition = correctionExecutionDisposition({
    proposalStatus: fields["Situação da Proposta"],
    executionStatus: fields["Situação da Execução"],
    currentHash,
    sourceHash: expectedSourceHash,
    afterHash: expectedAfterHash,
  });
  if (disposition === "reconcile") {
    return finalizeExecution({
      context,
      executorId: input.executorId,
      executedAt: input.executedAt,
      reconciled: true,
    });
  }
  if (disposition === "blocked-interrupted") {
    throw new Error("Existe uma execução interrompida que exige reconciliação técnica antes de nova tentativa.");
  }
  if (disposition === "blocked-state") {
    throw new Error("Somente propostas aprovadas podem ser executadas.");
  }
  if (disposition === "blocked-version") {
    throw new Error("O cadastro mudou após a proposta. A execução foi bloqueada por conflito de versão.");
  }

  const after = applyProposal(context.individual.fields, proposal);
  const afterHash = await hashFields(after);

  await updateAirtableRecord<ExecutionReviewFields>(
    REVIEW_TABLE_ID,
    context.review.id,
    {
      "Situação da Execução": "Aplicando",
      "Executor Técnico": input.executorId,
      "Snapshot Anterior à Aplicação": JSON.stringify(stableValues(context.individual.fields)),
      "Hash Após Aplicação": afterHash,
      "Nota da Execução": note,
      "Erro da Execução": "",
    },
    { baseId: context.configuration.individualsPreviewBaseId },
  );

  try {
    const updated = await updateAirtableRecord<IndividualFields>(
      context.configuration.individualsTableId,
      context.individual.id,
      proposalPatch(proposal),
      { baseId: context.configuration.individualsPreviewBaseId },
    );
    const verifiedHash = await hashFields(updated.fields);
    if (verifiedHash !== afterHash) {
      throw new Error("A verificação posterior não corresponde à alteração aprovada.");
    }

    return finalizeExecution({
      context,
      executorId: input.executorId,
      executedAt: input.executedAt,
      reconciled: false,
    });
  } catch (error) {
    await updateAirtableRecord<ExecutionReviewFields>(
      REVIEW_TABLE_ID,
      context.review.id,
      {
        "Situação da Execução": "Falhou",
        "Erro da Execução":
          error instanceof Error ? error.message.slice(0, 1000) : "Falha desconhecida.",
      },
      { baseId: context.configuration.individualsPreviewBaseId },
    );
    throw error;
  }
}
