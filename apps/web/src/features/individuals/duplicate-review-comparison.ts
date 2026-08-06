import "server-only";

import {
  NotFoundError,
  normalizeCpf,
  normalizeIdentityDocument,
  normalizeSearchText,
} from "@atlas/kernel";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

import { DUPLICATE_REVIEW_TABLE_ID } from "./duplicate-review-queue";

type ReviewFields = {
  "ID Revisão"?: string;
  Situação?: string;
  "Decisão Humana"?: string;
  "IDs Técnicos dos Registros de Origem"?:
    string;
};

type IndividualFields = {
  "Nome Completo"?: string;
  "Vulgo Principal"?: string;
  "Data de Nascimento"?: string;
  CPF?: string;
  "Registro Geral"?: string;
  Mãe?: string;
};

export type ComparisonState =
  | "match"
  | "different"
  | "missing";

export type ProtectedComparisonRecord = {
  readonly sourceRecordId:
    string;
  readonly legalName:
    string | null;
  readonly alias:
    string | null;
  readonly birthDate:
    string | null;
  readonly motherName:
    string | null;
  readonly maskedCpf:
    string | null;
  readonly maskedIdentityDocument:
    string | null;
};

export type ProtectedDuplicateReviewComparison = {
  readonly reviewRecordId:
    string;
  readonly reviewId: string;
  readonly status: string;
  readonly decision: string;
  readonly records:
    ProtectedComparisonRecord[];
  readonly comparison: {
    readonly legalName:
      ComparisonState;
    readonly alias:
      ComparisonState;
    readonly birthDate:
      ComparisonState;
    readonly motherName:
      ComparisonState;
    readonly cpf:
      ComparisonState;
    readonly identityDocument:
      ComparisonState;
  };
};

function escapeFormulaValue(
  value: string,
): string {
  return value.replace(
    /'/g,
    "\\'",
  );
}

function parseSourceRecordIds(
  value: string | undefined,
): string[] {
  if (!value) {
    throw new Error(
      "A revisão não possui registros de origem vinculados.",
    );
  }

  const parsed =
    JSON.parse(value) as unknown;

  if (
    !Array.isArray(parsed) ||
    parsed.length < 2 ||
    parsed.some(
      (item) =>
        typeof item !== "string",
    )
  ) {
    throw new Error(
      "Os vínculos técnicos da revisão são inválidos.",
    );
  }

  return parsed;
}

function maskDigits(
  value: string | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const digits =
    value.replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  return `••••••${digits.slice(-2)}`;
}

function compareValues(
  values:
    readonly (
      | string
      | null
      | undefined
    )[],
  normalize: (
    value: string,
  ) => string,
): ComparisonState {
  if (
    values.some(
      (value) => !value,
    )
  ) {
    return "missing";
  }

  const normalized =
    values.map((value) =>
      normalize(value ?? ""),
    );

  return normalized.every(
    (value) =>
      value === normalized[0],
  )
    ? "match"
    : "different";
}

export async function getProtectedDuplicateReviewComparison(
  reviewRecordId: string,
): Promise<ProtectedDuplicateReviewComparison> {
  const escapedReviewId =
    escapeFormulaValue(
      reviewRecordId.trim(),
    );

  const reviews =
    await listAllAirtableRecords<ReviewFields>(
      DUPLICATE_REVIEW_TABLE_ID,
      {
        fields: [
          "ID Revisão",
          "Situação",
          "Decisão Humana",
          "IDs Técnicos dos Registros de Origem",
        ],
        filterByFormula:
          `RECORD_ID()='${escapedReviewId}'`,
        maxRecords: 1,
      },
    );

  const review = reviews[0];

  if (!review) {
    throw new NotFoundError(
      "Revisão",
      reviewRecordId,
    );
  }

  const sourceRecordIds =
    parseSourceRecordIds(
      review.fields[
        "IDs Técnicos dos Registros de Origem"
      ],
    );

  const sourceFormula =
    sourceRecordIds
      .map(
        (recordId) =>
          `RECORD_ID()='${escapeFormulaValue(recordId)}'`,
      )
      .join(",");

  const configuration =
    getAirtableConfiguration();

  const sourceRecords =
    await listAllAirtableRecords<IndividualFields>(
      configuration.individualsTableId,
      {
        baseId:
          configuration
            .individualsPreviewBaseId,
        fields: [
          "Nome Completo",
          "Vulgo Principal",
          "Data de Nascimento",
          "CPF",
          "Registro Geral",
          "Mãe",
        ],
        filterByFormula:
          `OR(${sourceFormula})`,
        maxRecords:
          sourceRecordIds.length,
      },
    );

  if (
    sourceRecords.length !==
    sourceRecordIds.length
  ) {
    throw new Error(
      "Nem todos os registros vinculados à revisão foram encontrados.",
    );
  }

  const ordered =
    sourceRecordIds.map(
      (recordId) => {
        const record =
          sourceRecords.find(
            (candidate) =>
              candidate.id ===
              recordId,
          );

        if (!record) {
          throw new Error(
            "Registro de origem ausente na comparação.",
          );
        }

        return record;
      },
    );

  const records =
    ordered.map(
      (record) => ({
        sourceRecordId:
          record.id,
        legalName:
          record.fields[
            "Nome Completo"
          ]?.trim() || null,
        alias:
          record.fields[
            "Vulgo Principal"
          ]?.trim() || null,
        birthDate:
          record.fields[
            "Data de Nascimento"
          ] ?? null,
        motherName:
          record.fields.Mãe
            ?.trim() || null,
        maskedCpf:
          maskDigits(
            record.fields.CPF,
          ),
        maskedIdentityDocument:
          maskDigits(
            record.fields[
              "Registro Geral"
            ],
          ),
      }),
    );

  const fields =
    ordered.map(
      (record) =>
        record.fields,
    );

  return {
    reviewRecordId:
      review.id,
    reviewId:
      review.fields[
        "ID Revisão"
      ] ?? "",
    status:
      review.fields.Situação ??
      "Desconhecida",
    decision:
      review.fields[
        "Decisão Humana"
      ] ?? "Pendente",
    records,
    comparison: {
      legalName: compareValues(
        fields.map(
          (field) =>
            field[
              "Nome Completo"
            ],
        ),
        normalizeSearchText,
      ),
      alias: compareValues(
        fields.map(
          (field) =>
            field[
              "Vulgo Principal"
            ],
        ),
        normalizeSearchText,
      ),
      birthDate: compareValues(
        fields.map(
          (field) =>
            field[
              "Data de Nascimento"
            ],
        ),
        (value) => value,
      ),
      motherName:
        compareValues(
          fields.map(
            (field) =>
              field.Mãe,
          ),
          normalizeSearchText,
        ),
      cpf: compareValues(
        fields.map(
          (field) =>
            field.CPF,
        ),
        (value) =>
          normalizeCpf(value) ?? "",
      ),
      identityDocument:
        compareValues(
          fields.map(
            (field) =>
              field[
                "Registro Geral"
              ],
          ),
          (value) =>
            normalizeIdentityDocument(
              value,
            ) ?? "",
        ),
    },
  };
}
