import "server-only";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

import {
  recordLinksToVehicle,
  SafeVehicleOccurrence,
  toSafeVehicleOccurrence,
} from "./vehicle-occurrence-links-policy";

export async function listOccurrencesForVehicle(
  vehicleRecordId: string,
): Promise<SafeVehicleOccurrence[]> {
  if (!/^rec[a-zA-Z0-9]+$/.test(vehicleRecordId)) return [];

  const configuration = getAirtableConfiguration();
  const records = await listAllAirtableRecords<Record<string, unknown>>(
    configuration.occurrencesTableId,
    {
      baseId: configuration.baseId,
      maxRecords: 100,
    },
  );

  return records
    .filter((record) => record.fields["Registro Ativo"] !== false)
    .filter((record) => recordLinksToVehicle(record.fields, vehicleRecordId))
    .map(toSafeVehicleOccurrence)
    .sort((left, right) =>
      (right.occurredAt || "").localeCompare(left.occurredAt || ""),
    );
}
