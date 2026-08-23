import "server-only";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

import { getIndividualDirectoryEntry } from "./individual-directory";
import { extractLinkedRecordIds } from "./vehicle-individual-links-policy";

export type LinkedVehicleIndividual = {
  recordId: string;
  legalName: string;
  alias: string | null;
};

export async function listIndividualsForVehicle(
  vehicleRecordId: string,
): Promise<LinkedVehicleIndividual[]> {
  if (!/^rec[a-zA-Z0-9]+$/.test(vehicleRecordId)) return [];

  const configuration = getAirtableConfiguration();
  const records = await listAllAirtableRecords<Record<string, unknown>>(
    configuration.vehiclesTableId,
    {
      baseId: configuration.individualsPreviewBaseId,
      filterByFormula: `RECORD_ID()='${vehicleRecordId}'`,
      maxRecords: 1,
    },
  );

  const vehicle = records[0];
  if (!vehicle) return [];

  const candidates = extractLinkedRecordIds(vehicle.fields)
    .filter((recordId) => recordId !== vehicleRecordId);
  const individuals = await Promise.all(
    candidates.map((recordId) => getIndividualDirectoryEntry(recordId)),
  );

  return individuals
    .filter((individual) => individual !== null)
    .map((individual) => ({
      recordId: individual.recordId,
      legalName: individual.legalName,
      alias: individual.alias,
    }));
}
