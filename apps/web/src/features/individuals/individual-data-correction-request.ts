import "server-only";

import {
  createAirtableRecord,
  listAllAirtableRecords,
} from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

import { resolveIndividualQualityCorrectionTarget } from "./individual-data-quality-queue";

const REVIEW_TABLE_ID = "tblgtBw4wOvG4utaS";

type CorrectionReviewFields = {
  "ID Revisão"?: string;
  "Tipo da Revisão"?: string;
  Motivo?: string;
  Situação?: string;
  "Data de Abertura"?: string;
  Indivíduo?: string[];
  "Referência Opaca da Qualidade"?: string;
  "Campos para Saneamento"?: string;
  "Solicitante Técnico"?: string;
  "Chave Idempotente do Saneamento"?: string;
};

function escapeFormulaValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

export async function requestIndividualDataCorrection(input: {
  queueId: string;
  justification: string;
  requesterId: string;
  requestedAt: Date;
}): Promise<{ reviewId: string; created: boolean }> {
  const configuration = getAirtableConfiguration();
  const target = await resolveIndividualQualityCorrectionTarget(input.queueId);

  if (!target) {
    throw new Error(
      "O item de saneamento não foi encontrado ou já não possui pendências.",
    );
  }

  const idempotencyKey = `quality-correction:${input.queueId}`;
  const existing = await listAllAirtableRecords<CorrectionReviewFields>(
    REVIEW_TABLE_ID,
    {
      baseId: configuration.individualsPreviewBaseId,
      fields: ["ID Revisão", "Chave Idempotente do Saneamento", "Situação"],
      filterByFormula: `AND({Chave Idempotente do Saneamento}='${escapeFormulaValue(idempotencyKey)}',OR({Situação}='Aberta',{Situação}='Em andamento'))`,
      maxRecords: 1,
    },
  );

  const existingReviewId = existing[0]?.fields["ID Revisão"];
  if (existingReviewId) {
    return { reviewId: existingReviewId, created: false };
  }

  const reviewId = crypto.randomUUID();
  await createAirtableRecord<CorrectionReviewFields>(
    REVIEW_TABLE_ID,
    {
      "ID Revisão": reviewId,
      "Tipo da Revisão": "Excepcional",
      Motivo: `Qualidade cadastral: ${input.justification.trim()}`,
      Situação: "Aberta",
      "Data de Abertura": input.requestedAt.toISOString().slice(0, 10),
      Indivíduo: [target.sourceRecordId],
      "Referência Opaca da Qualidade": input.queueId,
      "Campos para Saneamento": target.issues.join("\n"),
      "Solicitante Técnico": input.requesterId,
      "Chave Idempotente do Saneamento": idempotencyKey,
    },
    { baseId: configuration.individualsPreviewBaseId },
  );

  return { reviewId, created: true };
}
