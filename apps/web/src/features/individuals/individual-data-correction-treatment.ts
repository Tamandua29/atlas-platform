import "server-only";

import {
  listAllAirtableRecords,
  updateAirtableRecord,
} from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

const REVIEW_TABLE_ID = "tblgtBw4wOvG4utaS";

type CorrectionTreatmentFields = {
  "ID Revisão"?: string;
  "Tipo da Revisão"?: string;
  Motivo?: string;
  Situação?: string;
  "Data de Abertura"?: string;
  "Data de Conclusão"?: string;
  Resultado?: string;
  "Referência Opaca da Qualidade"?: string;
  "Campos para Saneamento"?: string;
  "Solicitante Técnico"?: string;
  "Chave Idempotente do Saneamento"?: string;
  "Responsável Técnico do Saneamento"?: string;
  "Nota de Tratamento"?: string;
  "Atualizado em"?: string;
};

export type CorrectionTreatmentStatus =
  | "open"
  | "in_progress"
  | "completed"
  | "cancelled";

export type SafeCorrectionTreatmentItem = {
  reviewId: string;
  status: CorrectionTreatmentStatus;
  openedOn: string | null;
  issues: string[];
  justification: string | null;
  requesterId: string | null;
  assigneeId: string | null;
  treatmentNote: string | null;
  updatedAt: string | null;
};

function statusFromAirtable(value: string | undefined): CorrectionTreatmentStatus {
  if (value === "Em andamento") return "in_progress";
  if (value === "Concluída") return "completed";
  if (value === "Cancelada" || value === "Suspensa") return "cancelled";
  return "open";
}

function safeJustification(value: string | undefined): string | null {
  const normalized = value?.replace(/^Qualidade cadastral:\s*/i, "").trim();
  return normalized || null;
}

function toSafeItem(fields: CorrectionTreatmentFields): SafeCorrectionTreatmentItem | null {
  const reviewId = fields["ID Revisão"]?.trim();
  if (!reviewId) return null;

  return {
    reviewId,
    status: statusFromAirtable(fields.Situação),
    openedOn: fields["Data de Abertura"] ?? null,
    issues: fields["Campos para Saneamento"]
      ?.split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean) ?? [],
    justification: safeJustification(fields.Motivo),
    requesterId: fields["Solicitante Técnico"]?.trim() || null,
    assigneeId: fields["Responsável Técnico do Saneamento"]?.trim() || null,
    treatmentNote: fields["Nota de Tratamento"]?.trim() || null,
    updatedAt: fields["Atualizado em"] ?? null,
  };
}

async function loadCorrectionRequests() {
  const configuration = getAirtableConfiguration();
  return listAllAirtableRecords<CorrectionTreatmentFields>(
    REVIEW_TABLE_ID,
    {
      baseId: configuration.individualsPreviewBaseId,
      fields: [
        "ID Revisão",
        "Motivo",
        "Situação",
        "Data de Abertura",
        "Data de Conclusão",
        "Resultado",
        "Referência Opaca da Qualidade",
        "Campos para Saneamento",
        "Solicitante Técnico",
        "Chave Idempotente do Saneamento",
        "Responsável Técnico do Saneamento",
        "Nota de Tratamento",
        "Atualizado em",
      ],
      filterByFormula: "NOT({Chave Idempotente do Saneamento}='')",
      sort: [{ field: "Data de Abertura", direction: "desc" }],
    },
  );
}

export async function listSafeCorrectionTreatmentQueue(
  status: CorrectionTreatmentStatus | "all" = "all",
): Promise<SafeCorrectionTreatmentItem[]> {
  const records = await loadCorrectionRequests();
  return records
    .map((record) => toSafeItem(record.fields))
    .filter((item): item is SafeCorrectionTreatmentItem => Boolean(item))
    .filter((item) => status === "all" || item.status === status);
}

export async function transitionCorrectionTreatment(input: {
  reviewId: string;
  action: "claim" | "complete";
  actorId: string;
  actorIsAdministrator: boolean;
  note?: string;
  occurredAt: Date;
}): Promise<SafeCorrectionTreatmentItem> {
  const configuration = getAirtableConfiguration();
  const records = await loadCorrectionRequests();
  const record = records.find(
    (candidate) => candidate.fields["ID Revisão"] === input.reviewId,
  );

  if (!record) throw new Error("A solicitação de correção não foi encontrada.");

  const current = toSafeItem(record.fields);
  if (!current) throw new Error("A solicitação possui identificação inválida.");

  if (input.action === "claim") {
    if (current.status !== "open") {
      throw new Error("Somente solicitações abertas podem ser assumidas.");
    }

    const updated = await updateAirtableRecord<CorrectionTreatmentFields>(
      REVIEW_TABLE_ID,
      record.id,
      {
        Situação: "Em andamento",
        "Responsável Técnico do Saneamento": input.actorId,
        "Atualizado em": input.occurredAt.toISOString(),
      },
      { baseId: configuration.individualsPreviewBaseId },
    );

    const item = toSafeItem(updated.fields);
    if (!item) throw new Error("O Airtable retornou uma solicitação inválida.");
    return item;
  }

  const note = input.note?.trim() ?? "";
  if (note.length < 10 || note.length > 1000) {
    throw new Error("A nota de conclusão deve possuir entre 10 e 1000 caracteres.");
  }
  if (current.status !== "in_progress") {
    throw new Error("Somente solicitações em andamento podem ser concluídas.");
  }
  if (
    !input.actorIsAdministrator
    && current.assigneeId !== input.actorId
  ) {
    throw new Error("A solicitação deve ser concluída pelo revisor que assumiu o atendimento.");
  }

  const updated = await updateAirtableRecord<CorrectionTreatmentFields>(
    REVIEW_TABLE_ID,
    record.id,
    {
      Situação: "Concluída",
      "Data de Conclusão": input.occurredAt.toISOString().slice(0, 10),
      Resultado: "Solicitação de saneamento analisada e concluída por decisão humana.",
      "Nota de Tratamento": note,
      "Atualizado em": input.occurredAt.toISOString(),
    },
    { baseId: configuration.individualsPreviewBaseId },
  );

  const item = toSafeItem(updated.fields);
  if (!item) throw new Error("O Airtable retornou uma solicitação inválida.");
  return item;
}
