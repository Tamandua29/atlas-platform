import "server-only";

import {
  ConflictError,
  DuplicateReviewItem,
  NotFoundError,
  type DuplicateReviewConfidence,
  type DuplicateReviewStrategy,
  type FinalDuplicateReviewDecision,
} from "@atlas/kernel";

import {
  createAirtableRecord,
  listAllAirtableRecords,
  updateAirtableRecord,
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
  "Data de Conclusão"?: string;
  Resultado?: string;
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
  "Justificativa da Decisão Humana"?:
    string;
  "Identificador Técnico do Revisor"?:
    string;
  "Registro Ativo": boolean;
};

export type DuplicateReviewQueueResult = {
  readonly created: number;
  readonly existingSkipped: number;
};

export type DecidePersistedDuplicateReviewInput = {
  readonly recordId: string;
  readonly decision:
    FinalDuplicateReviewDecision;
  readonly justification: string;
  readonly reviewerId: string;
  readonly correlationId: string;
  readonly decidedAt: Date;
};

export type DecidePersistedDuplicateReviewResult = {
  readonly updated: boolean;
  readonly alreadyDecided: boolean;
  readonly decision:
    FinalDuplicateReviewDecision;
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

function mapDecisionToAirtable(
  decision:
    FinalDuplicateReviewDecision,
): string {
  if (decision === "same-person") {
    return "Mesma pessoa";
  }

  if (
    decision ===
    "different-people"
  ) {
    return "Pessoas distintas";
  }

  return "Inconclusiva";
}

function parseSourceRecordIds(
  value: string,
): string[] {
  const parsed =
    JSON.parse(value) as unknown;

  if (
    !Array.isArray(parsed) ||
    parsed.some(
      (item) =>
        typeof item !== "string",
    )
  ) {
    throw new Error(
      "Os identificadores técnicos da revisão são inválidos.",
    );
  }

  return parsed;
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

export async function decidePersistedDuplicateReview(
  input:
    DecidePersistedDuplicateReviewInput,
): Promise<DecidePersistedDuplicateReviewResult> {
  const recordId =
    escapeFormulaValue(
      input.recordId.trim(),
    );

  const records =
    await listAllAirtableRecords<AirtableDuplicateReviewFields>(
      DUPLICATE_REVIEW_TABLE_ID,
      {
        fields: [
          "Motivo",
          "Situação",
          "Data de Abertura",
          "IDs Técnicos dos Registros de Origem",
          "Estratégia de Correspondência",
          "Nível de Confiança",
          "ID de Correlação da Detecção",
          "Decisão Humana",
          "Justificativa da Decisão Humana",
          "Identificador Técnico do Revisor",
        ],
        filterByFormula:
          `RECORD_ID()='${recordId}'`,
        maxRecords: 1,
      },
    );

  const stored = records[0];

  if (!stored) {
    throw new NotFoundError(
      "A revisão informada não foi encontrada.",
    );
  }

  const decisionLabel =
    mapDecisionToAirtable(
      input.decision,
    );

  if (
    stored.fields[
      "Decisão Humana"
    ] !== "Pendente" ||
    stored.fields.Situação !==
      "Aberta"
  ) {
    const exactRetry =
      stored.fields[
        "Decisão Humana"
      ] === decisionLabel &&
      stored.fields[
        "Justificativa da Decisão Humana"
      ] ===
        input.justification.trim() &&
      stored.fields[
        "Identificador Técnico do Revisor"
      ] ===
        input.reviewerId.trim();

    if (exactRetry) {
      return {
        updated: false,
        alreadyDecided: true,
        decision:
          input.decision,
      };
    }

    throw new ConflictError(
      "A revisão já possui uma decisão final e não pode ser sobrescrita.",
    );
  }

  const review =
    DuplicateReviewItem.create({
      sourceRecordIds:
        parseSourceRecordIds(
          stored.fields[
            "IDs Técnicos dos Registros de Origem"
          ],
        ),
      strategy:
        stored.fields[
          "Estratégia de Correspondência"
        ] ===
        "CPF estruturalmente válido"
          ? "cpf"
          : "biographic",
      confidence:
        stored.fields[
          "Nível de Confiança"
        ] === "Alta"
          ? "high"
          : "medium",
      reason:
        stored.fields.Motivo,
      correlationId:
        input.correlationId,
      openedAt: new Date(
        stored.fields[
          "Data de Abertura"
        ],
      ),
    });

  review.decide({
    decision: input.decision,
    justification:
      input.justification,
    reviewerId:
      input.reviewerId,
    decidedAt:
      input.decidedAt,
  });

  await updateAirtableRecord<AirtableDuplicateReviewFields>(
    DUPLICATE_REVIEW_TABLE_ID,
    stored.id,
    {
      Situação: "Concluída",
      "Data de Conclusão":
        input.decidedAt
          .toISOString()
          .slice(0, 10),
      Resultado: decisionLabel,
      "Decisão Humana":
        decisionLabel,
      "Justificativa da Decisão Humana":
        review.justification,
      "Identificador Técnico do Revisor":
        review.reviewerId,
    },
  );

  return {
    updated: true,
    alreadyDecided: false,
    decision:
      input.decision,
  };
}
