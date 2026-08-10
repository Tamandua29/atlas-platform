import "server-only";

import type {
  DuplicateReviewConfidence,
  DuplicateReviewDecision,
  DuplicateReviewStrategy,
} from "@atlas/kernel";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";

import { DUPLICATE_REVIEW_TABLE_ID } from "./duplicate-review-queue";

export type DuplicateReviewListStatus =
  | "open"
  | "completed"
  | "all";

export type SafeDuplicateReviewListItem = {
  readonly recordId: string;
  readonly reviewId: string;
  readonly status:
    "open" | "completed";
  readonly openedOn: string;
  readonly completedOn:
    string | null;
  readonly strategy:
    DuplicateReviewStrategy;
  readonly confidence:
    DuplicateReviewConfidence;
  readonly recordCount: number;
  readonly decision:
    DuplicateReviewDecision;
};

type AirtableReviewListFields = {
  "ID Revisão"?: string;
  Situação?: string;
  "Data de Abertura"?: string;
  "Data de Conclusão"?: string;
  "Estratégia de Correspondência"?:
    string;
  "Nível de Confiança"?:
    string;
  "Quantidade de Registros no Grupo"?:
    number;
  "Decisão Humana"?: string;
};

function statusFormula(
  status:
    DuplicateReviewListStatus,
): string {
  const active =
    "{Registro Ativo}=1";

  if (status === "open") {
    return `AND(${active},{Situação}='Aberta')`;
  }

  if (
    status === "completed"
  ) {
    return `AND(${active},{Situação}='Concluída')`;
  }

  return active;
}

function mapStrategy(
  value: string | undefined,
): DuplicateReviewStrategy {
  return value ===
    "CPF estruturalmente válido"
    ? "cpf"
    : "biographic";
}

function mapConfidence(
  value: string | undefined,
): DuplicateReviewConfidence {
  return value === "Alta"
    ? "high"
    : "medium";
}

function mapDecision(
  value: string | undefined,
): DuplicateReviewDecision {
  if (value === "Mesma pessoa") {
    return "same-person";
  }

  if (
    value ===
    "Pessoas distintas"
  ) {
    return "different-people";
  }

  if (value === "Inconclusiva") {
    return "inconclusive";
  }

  return "pending";
}

export async function listSafeDuplicateReviews(
  status:
    DuplicateReviewListStatus,
  limit: number,
): Promise<
  SafeDuplicateReviewListItem[]
> {
  const records =
    await listAllAirtableRecords<AirtableReviewListFields>(
      DUPLICATE_REVIEW_TABLE_ID,
      {
        fields: [
          "ID Revisão",
          "Situação",
          "Data de Abertura",
          "Data de Conclusão",
          "Estratégia de Correspondência",
          "Nível de Confiança",
          "Quantidade de Registros no Grupo",
          "Decisão Humana",
        ],
        filterByFormula:
          statusFormula(status),
        sort: [
          {
            field:
              "Data de Abertura",
            direction: "desc",
          },
        ],
        maxRecords: limit,
      },
    );

  return records.map(
    (record) => ({
      recordId: record.id,
      reviewId:
        record.fields[
          "ID Revisão"
        ] ?? "",
      status:
        record.fields.Situação ===
        "Concluída"
          ? "completed"
          : "open",
      openedOn:
        record.fields[
          "Data de Abertura"
        ] ?? "",
      completedOn:
        record.fields[
          "Data de Conclusão"
        ] ?? null,
      strategy: mapStrategy(
        record.fields[
          "Estratégia de Correspondência"
        ],
      ),
      confidence: mapConfidence(
        record.fields[
          "Nível de Confiança"
        ],
      ),
      recordCount:
        record.fields[
          "Quantidade de Registros no Grupo"
        ] ?? 0,
      decision: mapDecision(
        record.fields[
          "Decisão Humana"
        ],
      ),
    }),
  );
}
