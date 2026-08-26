import "server-only";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

type VehicleFields = Record<string, unknown> & {
  "ID Veículo"?: string;
  Placa?: string;
  Marca?: string;
  Modelo?: string;
  Cor?: string;
  Ano?: number;
  "Tipo de Vínculo"?: string;
  Situação?: string;
  Fonte?: string;
  "Data da Informação"?: string;
};

export type IndividualVehicle = {
  recordId: string;
  maskedPlate: string;
  brand: string | null;
  model: string | null;
  color: string | null;
  year: number | null;
  relationshipType: string | null;
  status: string | null;
  source: string | null;
  informationDate: string | null;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function linkedToIndividual(
  fields: VehicleFields,
  individualRecordId: string,
): boolean {
  return Object.values(fields).some(
    (value) => Array.isArray(value) && value.includes(individualRecordId),
  );
}

function maskPlate(value: unknown): string {
  const plate = text(value)
    .replace(/[^A-Za-z0-9]/g, "")
    .toLocaleUpperCase("pt-BR");
  if (!plate) return "Placa não informada";
  if (plate.length <= 3) return "•".repeat(plate.length);
  return `${plate.slice(0, 3)}•${"•".repeat(Math.max(0, plate.length - 5))}${plate.slice(-1)}`;
}

function validYear(value: unknown): number | null {
  const currentYear = new Date().getUTCFullYear() + 1;
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1900 &&
    value <= currentYear
    ? value
    : null;
}

export async function listVehiclesForIndividual(
  individualRecordId: string,
): Promise<IndividualVehicle[]> {
  if (!/^rec[a-zA-Z0-9]+$/.test(individualRecordId)) return [];

  const configuration = getAirtableConfiguration();
  const records = await listAllAirtableRecords<VehicleFields>(
    configuration.vehiclesTableId,
    { baseId: configuration.individualsPreviewBaseId },
  );

  return records
    .filter((record) => linkedToIndividual(record.fields, individualRecordId))
    .map((record) => ({
      recordId: record.id,
      maskedPlate: maskPlate(record.fields.Placa),
      brand: text(record.fields.Marca) || null,
      model: text(record.fields.Modelo) || null,
      color: text(record.fields.Cor) || null,
      year: validYear(record.fields.Ano),
      relationshipType: text(record.fields["Tipo de Vínculo"]) || null,
      status: text(record.fields.Situação) || null,
      source: text(record.fields.Fonte) || null,
      informationDate: text(record.fields["Data da Informação"]) || null,
    }));
}
