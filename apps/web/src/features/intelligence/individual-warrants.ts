import "server-only";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

type WarrantFields = Record<string, unknown> & {
  "ID Mandado"?: string;
  "Número do Mandado"?: string;
  "Número do Processo"?: string;
  "Autoridade Emissora"?: string;
  Tribunal?: string;
  "Tipo de Mandado"?: string;
  "Data de Emissão"?: string;
  "Data de Validade"?: string;
  "Status do Mandado"?: string;
  "Fonte da Consulta"?: unknown[];
  "Data da Consulta"?: string;
};

export type IndividualWarrant = {
  recordId: string;
  maskedWarrantNumber: string;
  maskedCaseNumber: string;
  issuingAuthority: string | null;
  court: string | null;
  type: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  status: string | null;
  sources: string[];
  consultedAt: string | null;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function linkedToIndividual(
  fields: WarrantFields,
  individualRecordId: string,
): boolean {
  return Object.values(fields).some(
    (value) => Array.isArray(value) && value.includes(individualRecordId),
  );
}

function maskReference(value: unknown, fallback: string): string {
  const reference = text(value).replace(/\s/g, "");
  if (!reference) return fallback;
  if (reference.length <= 4) return "•".repeat(reference.length);
  return `${"•".repeat(Math.min(reference.length - 4, 10))}${reference.slice(-4)}`;
}

function labels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object" && "name" in item) {
        return text((item as { name?: unknown }).name);
      }
      return "";
    })
    .filter(Boolean);
}

export async function listWarrantsForIndividual(
  individualRecordId: string,
): Promise<IndividualWarrant[]> {
  if (!/^rec[a-zA-Z0-9]+$/.test(individualRecordId)) return [];

  const configuration = getAirtableConfiguration();
  const records = await listAllAirtableRecords<WarrantFields>(
    configuration.warrantsTableId,
    { baseId: configuration.individualsPreviewBaseId },
  );

  return records
    .filter((record) => linkedToIndividual(record.fields, individualRecordId))
    .map((record) => ({
      recordId: record.id,
      maskedWarrantNumber: maskReference(
        record.fields["Número do Mandado"],
        "Mandado sem referência",
      ),
      maskedCaseNumber: maskReference(
        record.fields["Número do Processo"],
        "Processo não informado",
      ),
      issuingAuthority: text(record.fields["Autoridade Emissora"]) || null,
      court: text(record.fields.Tribunal) || null,
      type: text(record.fields["Tipo de Mandado"]) || null,
      issuedAt: text(record.fields["Data de Emissão"]) || null,
      expiresAt: text(record.fields["Data de Validade"]) || null,
      status: text(record.fields["Status do Mandado"]) || null,
      sources: labels(record.fields["Fonte da Consulta"]),
      consultedAt: text(record.fields["Data da Consulta"]) || null,
    }));
}
