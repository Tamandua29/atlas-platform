import "server-only";

import {
  DuplicateReviewItem,
  type DuplicateReviewConfidence,
  type DuplicateReviewStrategy,
} from "@atlas/kernel";

import {
  createAirtableRecord,
  listAllAirtableRecords,
} from "@/lib/airtable/airtable.client";

export const DUPLICATE_REVIEW_TABLE_ID =
  "tblgtBw4wOvG4utaS";

type CandidateForReview = {
  readonly strategy:
    DuplicateReviewStrategy;
  readonly confidence:
    DuplicateReviewConfidence;
  readonly sourceRecordIds:
    readonly string[];
  readonly reason: string;
};

type ExistingReviewFields = {
  "Chave Idempotente da Revisão"?:
    string;
};

type AirtableDuplicateReviewFields = {
  "ID Revisão": string;
  "Tipo da Revisão": string;
  Motivo: string;
  Situação: string;
  "Data de Abertura": string;
  "Chave Idempotente da Revisão":
    string;
  "IDs Técnicos dos Registros de Origem":
    string;
  "Estratégia de Correspondência":
    string;
  "Nível de Confiança": string;
  "Quantidade de Registros no Grupo":
    number;
  "ID de Correlação da Detecção":
    string;
  "Decisão Humana": string;
  "Registro Ativo": boolean;
};

export type DuplicateReviewQueueResult = {
  readonly created: number;
  readonly existingSkipped: number;
};

function escapeFormulaValue(
  value: string,
): string {
  return value.replace(
    /'/g,
    "\\'",
  );
}

function mapReviewToAirtable(
  review: DuplicateReviewItem,
): AirtableDuplicateReviewFields {
  return {
    "ID Revisão": review.id.value,
    "Tipo da Revisão":
      "Excepcional",
    Motivo: review.reason,
    Situação: "Aberta",
    "Data de Abertura":
      review.openedAt
        .toISOString()
        .slice(0, 10),
    "Chave Idempotente da Revisão":
      review.idempotencyKey,
    "IDs Técnicos dos Registros de Origem":
      JSON.stringify(
        review.sourceRecordIds,
      ),
    "Estratégia de Correspondência":
      review.strategy === "cpf"
        ? "CPF estruturalmente válido"
        : "Biográfica",
    "Nível de Confiança":
      review.confidence === "high"
        ? "Alta"
        : "Média",
    "Quantidade de Registros no Grupo":
      review.sourceRecordIds.length,
    "ID de Correlação da Detecção":
      review.correlationId,
    "Decisão Humana": "Pendente",
    "Registro Ativo": true,
  };
}

export async function enqueueDuplicateReviewCandidates(
  candidates:
    readonly CandidateForReview[],
  correlationId: string,
): Promise<DuplicateReviewQueueResult> {
  let created = 0;
  let existingSkipped = 0;

  for (const candidate of candidates) {
    const review =
      DuplicateReviewItem.create({
        sourceRecordIds:
          candidate.sourceRecordIds,
        strategy:
          candidate.strategy,
        confidence:
          candidate.confidence,
        reason: candidate.reason,
        correlationId,
        openedAt: new Date(),
      });

    const key =
      escapeFormulaValue(
        review.idempotencyKey,
      );

    const existing =
      await listAllAirtableRecords<ExistingReviewFields>(
        DUPLICATE_REVIEW_TABLE_ID,
        {
          fields: [
            "Chave Idempotente da Revisão",
          ],
          filterByFormula:
            `{Chave Idempotente da Revisão}='${key}'`,
          maxRecords: 1,
        },
      );

    if (existing.length > 0) {
      existingSkipped += 1;
      continue;
    }

    await createAirtableRecord<AirtableDuplicateReviewFields>(
      DUPLICATE_REVIEW_TABLE_ID,
      mapReviewToAirtable(
        review,
      ),
    );

    created += 1;
  }

  return {
    created,
    existingSkipped,
  };
}
