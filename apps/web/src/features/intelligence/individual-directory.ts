import "server-only";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

type IndividualFields = {
  "Nome Completo"?: string;
  "Vulgo Principal"?: string;
  "Data de Nascimento"?: string;
  CPF?: string;
  "Registro Geral"?: string;
  Mãe?: string;
};

export type IndividualDirectoryEntry = {
  recordId: string;
  legalName: string;
  alias: string | null;
  birthDate: string | null;
  motherName: string | null;
  cpfPresent: boolean;
  identityDocumentPresent: boolean;
  createdAt: string;
};

function mapIndividual(record: {
  id: string;
  createdTime: string;
  fields: IndividualFields;
}): IndividualDirectoryEntry | null {
  const legalName = record.fields["Nome Completo"]?.trim();
  if (!legalName) return null;

  return {
    recordId: record.id,
    legalName,
    alias: record.fields["Vulgo Principal"]?.trim() || null,
    birthDate: record.fields["Data de Nascimento"] || null,
    motherName: record.fields.Mãe?.trim() || null,
    cpfPresent: Boolean(record.fields.CPF?.trim()),
    identityDocumentPresent: Boolean(record.fields["Registro Geral"]?.trim()),
    createdAt: record.createdTime,
  };
}

const fields = [
  "Nome Completo",
  "Vulgo Principal",
  "Data de Nascimento",
  "CPF",
  "Registro Geral",
  "Mãe",
];

export async function listIndividualDirectory(
  limit = 100,
): Promise<IndividualDirectoryEntry[]> {
  const configuration = getAirtableConfiguration();
  const records = await listAllAirtableRecords<IndividualFields>(
    configuration.individualsTableId,
    {
      baseId: configuration.individualsPreviewBaseId,
      fields,
      sort: [{ field: "Nome Completo", direction: "asc" }],
      maxRecords: Math.min(Math.max(limit, 1), 100),
    },
  );

  return records
    .map(mapIndividual)
    .filter((entry): entry is IndividualDirectoryEntry => entry !== null);
}

export async function getIndividualDirectoryEntry(
  recordId: string,
): Promise<IndividualDirectoryEntry | null> {
  if (!/^rec[a-zA-Z0-9]+$/.test(recordId)) return null;

  const configuration = getAirtableConfiguration();
  const records = await listAllAirtableRecords<IndividualFields>(
    configuration.individualsTableId,
    {
      baseId: configuration.individualsPreviewBaseId,
      fields,
      filterByFormula: `RECORD_ID()='${recordId}'`,
      maxRecords: 1,
    },
  );

  const record = records[0];
  return record ? mapIndividual(record) : null;
}
