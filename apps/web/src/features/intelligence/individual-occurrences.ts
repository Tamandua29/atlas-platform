import "server-only";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

type OccurrenceFields = {
  "Número da Ocorrência"?: string;
  "Data e Hora"?: string;
  Natureza?: string;
  Categoria?: string;
  Situação?: string;
  Fonte?: string;
  Confiabilidade?: string;
  "Situação da Verificação"?: string;
  Indivíduos?: string[];
  "Registro Ativo"?: boolean;
};

export type IndividualOccurrence = {
  recordId: string;
  maskedOccurrenceNumber: string;
  occurredAt: string | null;
  nature: string | null;
  category: string | null;
  status: string | null;
  source: string | null;
  confidence: string | null;
  verificationStatus: string | null;
};

const fields = [
  "Número da Ocorrência",
  "Data e Hora",
  "Natureza",
  "Categoria",
  "Situação",
  "Fonte",
  "Confiabilidade",
  "Situação da Verificação",
  "Indivíduos",
  "Registro Ativo",
];

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function maskOccurrenceNumber(value: unknown): string {
  const normalized = text(value).replace(/\s+/g, "");
  if (!normalized) return "Referência não informada";
  if (normalized.length <= 6)
    return `${"•".repeat(Math.max(0, normalized.length - 2))}${normalized.slice(-2)}`;
  return `${normalized.slice(0, 3)}${"•".repeat(Math.min(8, normalized.length - 6))}${normalized.slice(-3)}`;
}

export async function listOccurrencesForIndividual(
  individualRecordId: string,
): Promise<IndividualOccurrence[]> {
  if (!/^rec[a-zA-Z0-9]+$/.test(individualRecordId)) return [];

  const configuration = getAirtableConfiguration();
  const records = await listAllAirtableRecords<OccurrenceFields>(
    configuration.occurrencesTableId,
    {
      baseId: configuration.baseId,
      fields,
      maxRecords: 100,
    },
  );

  return records
    .filter((record) => record.fields["Registro Ativo"] !== false)
    .filter((record) => record.fields.Indivíduos?.includes(individualRecordId))
    .map((record) => ({
      recordId: record.id,
      maskedOccurrenceNumber: maskOccurrenceNumber(
        record.fields["Número da Ocorrência"],
      ),
      occurredAt: text(record.fields["Data e Hora"]) || null,
      nature: text(record.fields.Natureza) || null,
      category: text(record.fields.Categoria) || null,
      status: text(record.fields.Situação) || null,
      source: text(record.fields.Fonte) || null,
      confidence: text(record.fields.Confiabilidade) || null,
      verificationStatus:
        text(record.fields["Situação da Verificação"]) || null,
    }))
    .sort((left, right) =>
      (right.occurredAt || "").localeCompare(left.occurredAt || ""),
    );
}
