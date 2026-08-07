import "server-only";

import { normalizeCpf } from "@atlas/kernel";

import {
  listAllAirtableRecords,
  updateAirtableRecord,
} from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

const REVIEW_TABLE_ID = "tblgtBw4wOvG4utaS";
const CONFIRMATION_PHRASE = "REVERTER CORREÇÃO";

type ProposalKey =
  | "legalName"
  | "birthDate"
  | "motherName"
  | "cpf"
  | "identityDocument";

type StableValues = Record<ProposalKey, string | null>;

type ReversalReviewFields = {
  "ID Revisão"?: string;
  Indivíduo?: string[];
  "Proposta de Correção"?: string;
  "Situação da Proposta"?: string;
  "Proponente Técnico"?: string;
  "Aprovador Técnico"?: string;
  "Situação da Execução"?: string;
  "Executor Técnico"?: string;
  "Snapshot Anterior à Aplicação"?: string;
  "Hash da Versão de Origem"?: string;
  "Hash Após Aplicação"?: string;
  "Situação da Reversão"?: string;
  "Solicitante da Reversão"?: string;
  "Motivo da Reversão"?: string;
  "Reversão Solicitada em"?: string;
  "Aprovador da Reversão"?: string;
  "Justificativa da Reversão"?: string;
  "Reversão Decidida em"?: string;
  "Executor da Reversão"?: string;
  "Revertida em"?: string;
  "Hash Após Reversão"?: string;
  "Erro da Reversão"?: string;
};

type IndividualFields = {
  "Nome Completo"?: string;
  "Data de Nascimento"?: string;
  Mãe?: string;
  CPF?: string;
  "Registro Geral"?: string;
};

export type ReversalResult = {
  reviewId: string;
  reversalStatus: string;
  requesterId: string | null;
  approverId: string | null;
  executorId: string | null;
  revertedAt: string | null;
  sourceWritesPerformed: number;
  reconciled: boolean;
};

function stableValues(fields: IndividualFields): StableValues {
  return {
    legalName: fields["Nome Completo"]?.trim() ?? null,
    birthDate: fields["Data de Nascimento"]?.trim() ?? null,
    motherName: fields.Mãe?.trim() ?? null,
    cpf: normalizeCpf(fields.CPF) ?? null,
    identityDocument: fields["Registro Geral"]?.trim() ?? null,
  };
}

async function hashValues(values: StableValues): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(values)),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hashFields(fields: IndividualFields): Promise<string> {
  return hashValues(stableValues(fields));
}

function parseProposalKeys(raw: string | undefined): ProposalKey[] {
  if (!raw) throw new Error("A proposta aplicada não foi encontrada.");
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("A proposta aplicada possui formato inválido.");
  }
  const allowed: ProposalKey[] = [
    "legalName",
    "birthDate",
    "motherName",
    "cpf",
    "identityDocument",
  ];
  const keys = Object.keys(parsed).filter((key): key is ProposalKey =>
    allowed.includes(key as ProposalKey),
  );
  if (keys.length === 0 || keys.length !== Object.keys(parsed).length) {
    throw new Error("A proposta aplicada não possui campos reversíveis válidos.");
  }
  return keys;
}

function parseSnapshot(raw: string | undefined): StableValues {
  if (!raw) throw new Error("O snapshot anterior não foi encontrado.");
  const parsed = JSON.parse(raw) as Partial<StableValues>;
  const result: StableValues = {
    legalName: parsed.legalName ?? null,
    birthDate: parsed.birthDate ?? null,
    motherName: parsed.motherName ?? null,
    cpf: parsed.cpf ?? null,
    identityDocument: parsed.identityDocument ?? null,
  };
  for (const value of Object.values(result)) {
    if (value !== null && typeof value !== "string") {
      throw new Error("O snapshot anterior possui formato inválido.");
    }
  }
  return result;
}

function snapshotPatch(
  snapshot: StableValues,
  keys: ProposalKey[],
): Partial<Record<keyof IndividualFields, string | null>> {
  const patch: Partial<Record<keyof IndividualFields, string | null>> = {};
  if (keys.includes("legalName")) patch["Nome Completo"] = snapshot.legalName;
  if (keys.includes("birthDate")) patch["Data de Nascimento"] = snapshot.birthDate;
  if (keys.includes("motherName")) patch.Mãe = snapshot.motherName;
  if (keys.includes("cpf")) patch.CPF = snapshot.cpf;
  if (keys.includes("identityDocument")) {
    patch["Registro Geral"] = snapshot.identityDocument;
  }
  return patch;
}

async function loadReversalContext(reviewId: string) {
  const configuration = getAirtableConfiguration();
  const fields: Array<keyof ReversalReviewFields> = [
    "ID Revisão",
    "Indivíduo",
    "Proposta de Correção",
    "Situação da Proposta",
    "Proponente Técnico",
    "Aprovador Técnico",
    "Situação da Execução",
    "Executor Técnico",
    "Snapshot Anterior à Aplicação",
    "Hash da Versão de Origem",
    "Hash Após Aplicação",
    "Situação da Reversão",
    "Solicitante da Reversão",
    "Motivo da Reversão",
    "Reversão Solicitada em",
    "Aprovador da Reversão",
    "Justificativa da Reversão",
    "Reversão Decidida em",
    "Executor da Reversão",
    "Revertida em",
    "Hash Após Reversão",
    "Erro da Reversão",
  ];
  const reviews = await listAllAirtableRecords<ReversalReviewFields>(
    REVIEW_TABLE_ID,
    {
      baseId: configuration.individualsPreviewBaseId,
      fields,
      filterByFormula: `{ID Revisão}='${reviewId.replace(/'/g, "\\'")}'`,
      maxRecords: 1,
    },
  );
  const review = reviews[0];
  const sourceRecordId = review?.fields.Indivíduo?.[0];
  if (!review || !sourceRecordId) {
    throw new Error("A revisão aplicada ou o cadastro vinculado não foi encontrado.");
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

function validateReason(value: string, label: string): string {
  const reason = value.trim();
  if (reason.length < 10 || reason.length > 1000) {
    throw new Error(`${label} deve possuir entre 10 e 1000 caracteres.`);
  }
  return reason;
}

function result(
  fields: ReversalReviewFields,
  sourceWritesPerformed = 0,
  reconciled = false,
): ReversalResult {
  return {
    reviewId: fields["ID Revisão"] ?? "",
    reversalStatus: fields["Situação da Reversão"] ?? "",
    requesterId: fields["Solicitante da Reversão"]?.trim() || null,
    approverId: fields["Aprovador da Reversão"]?.trim() || null,
    executorId: fields["Executor da Reversão"]?.trim() || null,
    revertedAt: fields["Revertida em"] ?? null,
    sourceWritesPerformed,
    reconciled,
  };
}

export async function requestCorrectionReversal(input: {
  reviewId: string;
  requesterId: string;
  reason: string;
  requestedAt: Date;
}): Promise<ReversalResult> {
  const context = await loadReversalContext(input.reviewId);
  const fields = context.review.fields;
  if (fields["Situação da Execução"] !== "Aplicada" || fields["Situação da Proposta"] !== "Aplicada") {
    throw new Error("Somente uma correção aplicada pode receber solicitação de reversão.");
  }
  if (fields["Situação da Reversão"]) {
    if (fields["Solicitante da Reversão"] === input.requesterId) return result(fields);
    throw new Error("Já existe um fluxo de reversão para esta correção.");
  }
  if (fields["Executor Técnico"] === input.requesterId) {
    throw new Error("O executor original não pode solicitar a reversão da própria escrita.");
  }
  const currentHash = await hashFields(context.individual.fields);
  if (!fields["Hash Após Aplicação"] || currentHash !== fields["Hash Após Aplicação"]) {
    throw new Error("O cadastro mudou após a aplicação. A reversão foi bloqueada por conflito de versão.");
  }
  const reason = validateReason(input.reason, "O motivo da reversão");
  await updateAirtableRecord<ReversalReviewFields>(
    REVIEW_TABLE_ID,
    context.review.id,
    {
      "Situação da Reversão": "Pendente de aprovação",
      "Solicitante da Reversão": input.requesterId,
      "Motivo da Reversão": reason,
      "Reversão Solicitada em": input.requestedAt.toISOString(),
      "Erro da Reversão": "",
    },
    { baseId: context.configuration.individualsPreviewBaseId },
  );
  return result({
    ...fields,
    "Situação da Reversão": "Pendente de aprovação",
    "Solicitante da Reversão": input.requesterId,
    "Motivo da Reversão": reason,
    "Reversão Solicitada em": input.requestedAt.toISOString(),
  });
}

export async function decideCorrectionReversal(input: {
  reviewId: string;
  approverId: string;
  decision: "approve" | "reject";
  reason: string;
  decidedAt: Date;
}): Promise<ReversalResult> {
  const context = await loadReversalContext(input.reviewId);
  const fields = context.review.fields;
  if (fields["Situação da Reversão"] !== "Pendente de aprovação") {
    throw new Error("Somente reversões pendentes podem receber uma decisão.");
  }
  const requesterId = fields["Solicitante da Reversão"]?.trim();
  if (!requesterId) throw new Error("A solicitação não possui identidade responsável.");
  if (input.approverId === requesterId || input.approverId === fields["Executor Técnico"]) {
    throw new Error("A decisão exige identidade distinta do solicitante e do executor original.");
  }
  const reason = validateReason(input.reason, "A justificativa da reversão");
  const status = input.decision === "approve" ? "Aprovada" : "Rejeitada";
  await updateAirtableRecord<ReversalReviewFields>(
    REVIEW_TABLE_ID,
    context.review.id,
    {
      "Situação da Reversão": status,
      "Aprovador da Reversão": input.approverId,
      "Justificativa da Reversão": reason,
      "Reversão Decidida em": input.decidedAt.toISOString(),
    },
    { baseId: context.configuration.individualsPreviewBaseId },
  );
  return result({
    ...fields,
    "Situação da Reversão": status,
    "Aprovador da Reversão": input.approverId,
    "Justificativa da Reversão": reason,
    "Reversão Decidida em": input.decidedAt.toISOString(),
  });
}

async function finalizeReversal(input: {
  context: Awaited<ReturnType<typeof loadReversalContext>>;
  executorId: string;
  revertedAt: Date;
  expectedHash: string;
  sourceWritesPerformed: number;
  reconciled: boolean;
}): Promise<ReversalResult> {
  const patch: Partial<ReversalReviewFields> = {
    "Situação da Reversão": "Revertida",
    "Executor da Reversão": input.executorId,
    "Revertida em": input.revertedAt.toISOString(),
    "Hash Após Reversão": input.expectedHash,
    "Erro da Reversão": "",
  };
  await updateAirtableRecord<ReversalReviewFields>(
    REVIEW_TABLE_ID,
    input.context.review.id,
    patch,
    { baseId: input.context.configuration.individualsPreviewBaseId },
  );
  return result(
    { ...input.context.review.fields, ...patch },
    input.sourceWritesPerformed,
    input.reconciled,
  );
}

export async function executeCorrectionReversal(input: {
  reviewId: string;
  executorId: string;
  confirmation: string;
  note: string;
  revertedAt: Date;
}): Promise<ReversalResult> {
  if (input.confirmation.trim() !== CONFIRMATION_PHRASE) {
    throw new Error(`Digite exatamente “${CONFIRMATION_PHRASE}” para confirmar a reversão.`);
  }
  validateReason(input.note, "A nota da reversão");
  const context = await loadReversalContext(input.reviewId);
  const fields = context.review.fields;

  if (fields["Situação da Reversão"] === "Revertida") {
    return result(fields, 0, true);
  }
  if (fields["Situação da Reversão"] !== "Aprovada"
    && fields["Situação da Reversão"] !== "Revertendo"
    && fields["Situação da Reversão"] !== "Falhou") {
    throw new Error("Somente uma reversão aprovada pode ser executada.");
  }
  if (fields["Aprovador da Reversão"] !== input.executorId) {
    throw new Error("A reversão deve ser executada pela identidade segregada que a aprovou.");
  }

  const snapshot = parseSnapshot(fields["Snapshot Anterior à Aplicação"]);
  const proposalKeys = parseProposalKeys(fields["Proposta de Correção"]);
  const expectedRevertedHash = await hashValues(snapshot);
  if (fields["Hash da Versão de Origem"] && expectedRevertedHash !== fields["Hash da Versão de Origem"]) {
    throw new Error("O snapshot anterior não corresponde ao hash preservado na proposta.");
  }

  const currentHash = await hashFields(context.individual.fields);
  if (
    (fields["Situação da Reversão"] === "Revertendo" || fields["Situação da Reversão"] === "Falhou")
    && currentHash === expectedRevertedHash
  ) {
    return finalizeReversal({
      context,
      executorId: input.executorId,
      revertedAt: input.revertedAt,
      expectedHash: expectedRevertedHash,
      sourceWritesPerformed: 0,
      reconciled: true,
    });
  }
  if (!fields["Hash Após Aplicação"] || currentHash !== fields["Hash Após Aplicação"]) {
    throw new Error("O cadastro mudou após a correção. A reversão foi bloqueada por conflito de versão.");
  }

  await updateAirtableRecord<ReversalReviewFields>(
    REVIEW_TABLE_ID,
    context.review.id,
    {
      "Situação da Reversão": "Revertendo",
      "Executor da Reversão": input.executorId,
      "Hash Após Reversão": expectedRevertedHash,
      "Erro da Reversão": "",
    },
    { baseId: context.configuration.individualsPreviewBaseId },
  );

  try {
    const updated = await updateAirtableRecord<IndividualFields>(
      context.configuration.individualsTableId,
      context.individual.id,
      snapshotPatch(snapshot, proposalKeys),
      { baseId: context.configuration.individualsPreviewBaseId },
    );
    if (await hashFields(updated.fields) !== expectedRevertedHash) {
      throw new Error("A verificação posterior não corresponde ao snapshot autorizado.");
    }
    return finalizeReversal({
      context,
      executorId: input.executorId,
      revertedAt: input.revertedAt,
      expectedHash: expectedRevertedHash,
      sourceWritesPerformed: 1,
      reconciled: false,
    });
  } catch (error) {
    await updateAirtableRecord<ReversalReviewFields>(
      REVIEW_TABLE_ID,
      context.review.id,
      {
        "Situação da Reversão": "Falhou",
        "Erro da Reversão": error instanceof Error
          ? error.message.slice(0, 1000)
          : "Falha desconhecida.",
      },
      { baseId: context.configuration.individualsPreviewBaseId },
    );
    throw error;
  }
}
