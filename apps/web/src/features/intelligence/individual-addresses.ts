import "server-only";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

type AddressFields = Record<string, unknown> & {
  "ID Endereço"?: string;
  "Endereço Completo"?: string;
  Logradouro?: string;
  Número?: string;
  Complemento?: string;
  Bairro?: string;
  Município?: string;
  Estado?: string;
  CEP?: string;
  Latitude?: number;
  Longitude?: number;
  "Situação da Verificação"?: string;
  Fonte?: string;
};

export type IndividualAddress = {
  recordId: string;
  label: string;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  verificationStatus: string | null;
  source: string | null;
  latitude: number | null;
  longitude: number | null;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function addressLabel(fields: AddressFields): string {
  const complete = text(fields["Endereço Completo"]);
  if (complete) return complete;

  const street = [text(fields.Logradouro), text(fields.Número)]
    .filter(Boolean)
    .join(", ");

  return [
    street,
    text(fields.Complemento),
    text(fields.Bairro),
    text(fields.Município),
    text(fields.Estado),
    text(fields.CEP),
  ]
    .filter(Boolean)
    .join(" — ");
}

function linkedToIndividual(
  fields: AddressFields,
  individualRecordId: string,
): boolean {
  return Object.values(fields).some(
    (value) => Array.isArray(value) && value.includes(individualRecordId),
  );
}

function coordinate(
  value: unknown,
  minimum: number,
  maximum: number,
): number | null {
  return typeof value === "number"
    && Number.isFinite(value)
    && value >= minimum
    && value <= maximum
    ? value
    : null;
}

export async function listAddressesForIndividual(
  individualRecordId: string,
): Promise<IndividualAddress[]> {
  if (!/^rec[a-zA-Z0-9]+$/.test(individualRecordId)) return [];

  const configuration = getAirtableConfiguration();
  const records = await listAllAirtableRecords<AddressFields>(
    configuration.addressesTableId,
    { baseId: configuration.individualsPreviewBaseId },
  );

  return records
    .filter((record) => linkedToIndividual(record.fields, individualRecordId))
    .map((record) => ({
      recordId: record.id,
      label: addressLabel(record.fields) || "Endereço sem descrição",
      neighborhood: text(record.fields.Bairro) || null,
      city: text(record.fields.Município) || null,
      state: text(record.fields.Estado) || null,
      verificationStatus: text(record.fields["Situação da Verificação"]) || null,
      source: text(record.fields.Fonte) || null,
      latitude: coordinate(record.fields.Latitude, -90, 90),
      longitude: coordinate(record.fields.Longitude, -180, 180),
    }));
}
