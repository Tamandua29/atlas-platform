import "server-only";

import type {
  AuditEntry,
  AuditRepository,
} from "@atlas/kernel";

import {
  createAirtableRecord,
  listAllAirtableRecords,
} from "@/lib/airtable/airtable.client";

import {
  AUDIT_TABLE_ID,
  mapAuditEntryToAirtable,
  type AirtableAuditFields,
} from "./audit-airtable-mapper";

type ExistingAuditFields = {
  "Identificador da Sessão ou Requisição"?: string;
};

function escapeFormulaValue(
  value: string,
): string {
  return value.replace(
    /'/g,
    "\\'",
  );
}

export class AirtableAuditRepository
  implements AuditRepository
{
  async save(
    entry: AuditEntry,
  ): Promise<void> {
    const correlationId =
      escapeFormulaValue(
        entry.correlationId,
      );

    const existing =
      await listAllAirtableRecords<ExistingAuditFields>(
        AUDIT_TABLE_ID,
        {
          fields: [
            "Identificador da Sessão ou Requisição",
          ],
          filterByFormula:
            `{Identificador da Sessão ou Requisição}='${correlationId}'`,
          maxRecords: 1,
        },
      );

    if (existing.length > 0) {
      return;
    }

    await createAirtableRecord<AirtableAuditFields>(
      AUDIT_TABLE_ID,
      mapAuditEntryToAirtable(
        entry,
      ),
    );
  }
}

export async function persistAuditSafely(
  entry: AuditEntry,
): Promise<boolean> {
  try {
    await new AirtableAuditRepository()
      .save(entry);

    return true;
  } catch (error) {
    console.error(
      "Falha isolada na persistência da auditoria:",
      error,
    );

    return false;
  }
}
