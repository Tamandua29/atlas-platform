import "server-only";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

import { maskVehiclePlate } from "./vehicle-directory-policy";

type VehicleFields = {
  Placa?: string;
  Marca?: string;
  Modelo?: string;
  Cor?: string;
  Ano?: number;
  Situação?: string;
  "Tipo de Vínculo"?: string;
};

export type VehicleDirectoryEntry = {
  recordId: string;
  maskedPlate: string;
  brand: string | null;
  model: string | null;
  color: string | null;
  year: number | null;
  status: string | null;
  relationshipType: string | null;
};

const safeFields = ["Placa", "Marca", "Modelo", "Cor", "Ano", "Situação", "Tipo de Vínculo"];

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function mapVehicle(record: {
  id: string;
  fields: VehicleFields;
}): VehicleDirectoryEntry {
  return {
    recordId: record.id,
    maskedPlate: maskVehiclePlate(record.fields.Placa),
    brand: text(record.fields.Marca) || null,
    model: text(record.fields.Modelo) || null,
    color: text(record.fields.Cor) || null,
    year: validYear(record.fields.Ano),
    status: text(record.fields.Situação) || null,
    relationshipType: text(record.fields["Tipo de Vínculo"]) || null,
  };
}

function validYear(value: unknown): number | null {
  const maximum = new Date().getUTCFullYear() + 1;
  return typeof value === "number" && Number.isInteger(value) && value >= 1900 && value <= maximum
    ? value
    : null;
}

export async function listVehicleDirectory(limit = 100): Promise<VehicleDirectoryEntry[]> {
  const configuration = getAirtableConfiguration();
  const records = await listAllAirtableRecords<VehicleFields>(configuration.vehiclesTableId, {
    baseId: configuration.individualsPreviewBaseId,
    fields: safeFields,
    maxRecords: Math.min(Math.max(limit, 1), 200),
  });

  return records
    .map(mapVehicle)
    .sort((left, right) => {
      const leftDescription = `${left.brand || ""} ${left.model || ""}`;
      const rightDescription = `${right.brand || ""} ${right.model || ""}`;
      return leftDescription.localeCompare(rightDescription, "pt-BR");
    });
}

export async function getVehicleDirectoryEntry(
  recordId: string,
): Promise<VehicleDirectoryEntry | null> {
  if (!/^rec[a-zA-Z0-9]+$/.test(recordId)) return null;

  const configuration = getAirtableConfiguration();
  const records = await listAllAirtableRecords<VehicleFields>(configuration.vehiclesTableId, {
    baseId: configuration.individualsPreviewBaseId,
    fields: safeFields,
    filterByFormula: `RECORD_ID()='${recordId}'`,
    maxRecords: 1,
  });

  const record = records[0];
  return record ? mapVehicle(record) : null;
}
