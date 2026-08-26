import "server-only";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

type AirtableAttachment = {
  id?: string;
  url?: string;
  filename?: string;
  type?: string;
  width?: number;
  height?: number;
  thumbnails?: {
    small?: { url?: string };
    large?: { url?: string };
    full?: { url?: string };
  };
};

type IndividualFields = {
  "Nome Completo"?: string;
  "Vulgo Principal"?: string;
  "Data de Nascimento"?: string;
  CPF?: string;
  "Registro Geral"?: string;
  Mãe?: string;
  "Foto Principal"?: AirtableAttachment[];
};

export type ProtectedPhoto = {
  id: string;
  url: string;
  thumbnailUrl: string;
  filename: string | null;
  width: number | null;
  height: number | null;
};

export type IndividualDirectoryEntry = {
  recordId: string;
  legalName: string;
  alias: string | null;
  birthDate: string | null;
  motherName: string | null;
  cpfPresent: boolean;
  identityDocumentPresent: boolean;
  mainPhoto: ProtectedPhoto | null;
  createdAt: string;
};

function mapIndividual(record: {
  id: string;
  createdTime: string;
  fields: IndividualFields;
}): IndividualDirectoryEntry | null {
  const legalName = record.fields["Nome Completo"]?.trim();
  if (!legalName) return null;

  const attachment = record.fields["Foto Principal"]?.find(
    (item) => item.url && (!item.type || item.type.startsWith("image/")),
  );

  return {
    recordId: record.id,
    legalName,
    alias: record.fields["Vulgo Principal"]?.trim() || null,
    birthDate: record.fields["Data de Nascimento"] || null,
    motherName: record.fields.Mãe?.trim() || null,
    cpfPresent: Boolean(record.fields.CPF?.trim()),
    identityDocumentPresent: Boolean(record.fields["Registro Geral"]?.trim()),
    mainPhoto: attachment?.url
      ? {
          id: attachment.id || `main-${record.id}`,
          url: attachment.url,
          thumbnailUrl:
            attachment.thumbnails?.large?.url ||
            attachment.thumbnails?.full?.url ||
            attachment.thumbnails?.small?.url ||
            attachment.url,
          filename: attachment.filename || null,
          width: attachment.width || null,
          height: attachment.height || null,
        }
      : null,
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
  "Foto Principal",
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
