import "server-only";

import { normalizeCpf } from "@atlas/kernel";

import {
  listAllAirtableRecords,
  updateAirtableRecord,
} from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

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

function parseProposal(raw: string | undefined): ProposalValues {
  if (!raw) throw new Error("A proposta aprovada não possui valores estruturados.");
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("A proposta aprovada possui formato inválido.");
  }

  const allowed: ProposalKey[] = [
    "legalName",
    "birthDate",
    "motherName",
    "cpf",
    "identityDocument",
  ];
  const result: ProposalValues = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!allowed.includes(key as ProposalKey) || typeof value !== "string" || !value.trim()) {
      throw new Error("A proposta aprovada contém campo ou valor inválido.");
    }
    result[key as ProposalKey] = value.trim();
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
  if (input.executorId === proposerId || input.executorId === approverId) {
    throw new Error("A execução exige uma terceira identidade diferente do proponente e do aprovador.");
  }
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
  if (fields["Situação da Proposta"] !== "Aprovada") {
    throw new Error("Somente propostas aprovadas podem ser executadas.");
  }

  const proposal = parseProposal(fields["Proposta de Correção"]);
  const currentHash = await hashFields(context.individual.fields);
  const expectedSourceHash = fields["Hash da Versão de Origem"];
  const expectedAfterHash = fields["Hash Após Aplicação"];

  if (
    fields["Situação da Execução"] === "Aplicando"
    || fields["Situação da Execução"] === "Falhou"
  ) {
    if (expectedAfterHash && currentHash === expectedAfterHash) {
      return finalizeExecution({
        context,
        executorId: input.executorId,
        executedAt: input.executedAt,
        reconciled: true,
      });
    }
    throw new Error("Existe uma execução interrompida que exige reconciliação técnica antes de nova tentativa.");
  }

  if (!expectedSourceHash || currentHash !== expectedSourceHash) {
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
