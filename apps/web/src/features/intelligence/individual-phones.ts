import "server-only";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

type PhoneFields = Record<string, unknown> & {
  "ID Telefone"?: string;
  Número?: string;
  Tipo?: string;
  Operadora?: string;
  Situação?: string;
  Fonte?: string;
  "Data da Informação"?: string;
};

export type IndividualPhone = {
  recordId: string;
  maskedNumber: string;
  type: string | null;
  carrier: string | null;
  status: string | null;
  source: string | null;
  informationDate: string | null;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function linkedToIndividual(
  fields: PhoneFields,
  individualRecordId: string,
): boolean {
  return Object.values(fields).some(
    (value) => Array.isArray(value) && value.includes(individualRecordId),
  );
}

function maskPhone(value: unknown): string {
  const digits = text(value).replace(/\D/g, "");
  if (!digits) return "Número não informado";

  const visibleDigits = digits.slice(-4);
  const hiddenLength = Math.max(4, Math.min(digits.length - 4, 8));
  return `${"•".repeat(hiddenLength)}${visibleDigits}`;
}

export async function listPhonesForIndividual(
  individualRecordId: string,
): Promise<IndividualPhone[]> {
  if (!/^rec[a-zA-Z0-9]+$/.test(individualRecordId)) return [];

  const configuration = getAirtableConfiguration();
  const records = await listAllAirtableRecords<PhoneFields>(
    configuration.phonesTableId,
    { baseId: configuration.individualsPreviewBaseId },
  );

  return records
    .filter((record) => linkedToIndividual(record.fields, individualRecordId))
    .map((record) => ({
      recordId: record.id,
      maskedNumber: maskPhone(record.fields.Número),
      type: text(record.fields.Tipo) || null,
      carrier: text(record.fields.Operadora) || null,
      status: text(record.fields.Situação) || null,
      source: text(record.fields.Fonte) || null,
      informationDate: text(record.fields["Data da Informação"]) || null,
    }));
}
