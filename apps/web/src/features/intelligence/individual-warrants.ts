import "server-only";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";
import { classifyWarrantAttention } from "@/features/intelligence/warrant-monitoring";

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

export type OperationalWarrant = Omit<IndividualWarrant, "sources">;

export type IndividualWarrantSummary = {
  linkedCount: number;
  activeCount: number;
  expiringCount: number;
  needsVerificationCount: number;
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
function toIndividualWarrant(record: {
  id: string;
  fields: WarrantFields;
}): IndividualWarrant {
  return {
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
  };
}

async function loadWarrants(): Promise<
  Array<{ id: string; fields: WarrantFields }>
> {
  const configuration = getAirtableConfiguration();
  return listAllAirtableRecords<WarrantFields>(configuration.warrantsTableId, {
    baseId: configuration.individualsPreviewBaseId,
  });
}

export async function listOperationalWarrants(
  limit = 100,
): Promise<OperationalWarrant[]> {
  const safeLimit = Math.max(1, Math.min(Math.trunc(limit) || 100, 200));
  const records = await loadWarrants();
  return records.slice(0, safeLimit).map((record) => {
    const warrant = toIndividualWarrant(record);
    return {
      recordId: warrant.recordId,
      maskedWarrantNumber: warrant.maskedWarrantNumber,
      maskedCaseNumber: warrant.maskedCaseNumber,
      issuingAuthority: warrant.issuingAuthority,
      court: warrant.court,
      type: warrant.type,
      issuedAt: warrant.issuedAt,
      expiresAt: warrant.expiresAt,
      status: warrant.status,
      consultedAt: warrant.consultedAt,
    };
  });
}

export async function listWarrantsForIndividual(
  individualRecordId: string,
): Promise<IndividualWarrant[]> {
  if (!/^rec[a-zA-Z0-9]+$/.test(individualRecordId)) return [];

  const records = await loadWarrants();

  return records
    .filter((record) => linkedToIndividual(record.fields, individualRecordId))
    .map(toIndividualWarrant);
}

export async function summarizeWarrantsByIndividual(
  individualRecordIds: string[],
  now = new Date(),
): Promise<Record<string, IndividualWarrantSummary>> {
  const validIds = new Set(
    individualRecordIds.filter((recordId) =>
      /^rec[a-zA-Z0-9]+$/.test(recordId),
    ),
  );
  const summaries = Object.fromEntries(
    [...validIds].map((recordId) => [
      recordId,
      {
        linkedCount: 0,
        activeCount: 0,
        expiringCount: 0,
        needsVerificationCount: 0,
      },
    ]),
  ) as Record<string, IndividualWarrantSummary>;

  if (validIds.size === 0) return summaries;

  const records = await loadWarrants();
  for (const record of records) {
    const warrant = toIndividualWarrant(record);
    const attention = classifyWarrantAttention(
      warrant.status,
      warrant.expiresAt,
      now,
    );

    for (const recordId of validIds) {
      if (!linkedToIndividual(record.fields, recordId)) continue;
      const summary = summaries[recordId];
      summary.linkedCount += 1;
      if (attention === "active") summary.activeCount += 1;
      if (attention === "expiring") summary.expiringCount += 1;
      if (attention === "unknown") summary.needsVerificationCount += 1;
    }
  }

  return summaries;
}
