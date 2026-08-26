import "server-only";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";

import type {
  OperationalZone,
  OperationalZoneStatus,
  OperationalZoneType,
} from "./operational-map.types";
import {
  normalizeOperationalZonePriority,
  parseOperationalZonePolygon,
} from "./operational-zones.parser";

type ZoneFields = Record<string, unknown>;

const ZONE_TYPES = new Set<OperationalZoneType>([
  "responsibility-area",
  "patrol-sector",
  "sensitive-area",
  "monitoring-area",
]);

const ZONE_STATUSES = new Set<OperationalZoneStatus>([
  "active",
  "attention",
  "inactive",
]);

function text(fields: ZoneFields, ...names: string[]) {
  for (const name of names) {
    const value = fields[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export async function loadOperationalZonesFromAirtable(): Promise<
  OperationalZone[]
> {
  const tableId = process.env.AIRTABLE_OPERATIONAL_ZONES_TABLE_ID?.trim();
  if (!tableId) return [];

  const records = await listAllAirtableRecords<ZoneFields>(tableId);
  const zones: OperationalZone[] = [];

  for (const record of records) {
    const name = text(record.fields, "Nome", "Name");
    const rawType = text(record.fields, "Tipo", "Type");
    const rawStatus = text(record.fields, "Status") ?? "active";
    const coordinates = parseOperationalZonePolygon(
      record.fields["Geometria GeoJSON"] ?? record.fields.GeoJSON,
    );

    if (
      !name ||
      !rawType ||
      !ZONE_TYPES.has(rawType as OperationalZoneType) ||
      !ZONE_STATUSES.has(rawStatus as OperationalZoneStatus) ||
      !coordinates
    ) {
      continue;
    }

    zones.push({
      id: record.id,
      name,
      description:
        text(record.fields, "Descrição", "Description") ??
        "Área explicitamente cadastrada na fonte.",
      type: rawType as OperationalZoneType,
      status: rawStatus as OperationalZoneStatus,
      priority: normalizeOperationalZonePriority(
        text(record.fields, "Prioridade", "Priority"),
      ),
      reference: text(record.fields, "Referência", "Reference") ?? record.id,
      responsibleUnit:
        text(record.fields, "Unidade Responsável", "Responsible Unit") ??
        "Não informada",
      coordinates,
      createdAt: record.createdTime,
      updatedAt:
        text(record.fields, "Atualizado em", "Updated At") ??
        record.createdTime,
    });
  }

  return zones;
}
