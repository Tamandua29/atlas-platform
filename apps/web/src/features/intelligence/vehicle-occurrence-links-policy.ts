export type SafeVehicleOccurrence = {
  recordId: string;
  maskedOccurrenceNumber: string;
  occurredAt: string | null;
  category: string | null;
  status: string | null;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function firstText(
  fields: Record<string, unknown>,
  names: string[],
): string {
  for (const name of names) {
    const value = text(fields[name]);
    if (value) return value;
  }

  return "";
}

export function recordLinksToVehicle(
  fields: Record<string, unknown>,
  vehicleRecordId: string,
): boolean {
  return Object.values(fields).some(
    (value) => Array.isArray(value) && value.includes(vehicleRecordId),
  );
}

export function maskOccurrenceNumber(value: unknown): string {
  const normalized = text(value).replace(/\s+/g, "");
  if (!normalized) return "Referência não informada";
  if (normalized.length <= 6) {
    return `${"•".repeat(Math.max(0, normalized.length - 2))}${normalized.slice(-2)}`;
  }

  return `${normalized.slice(0, 3)}${"•".repeat(Math.min(8, normalized.length - 6))}${normalized.slice(-3)}`;
}

export function toSafeVehicleOccurrence(
  record: { id: string; fields: Record<string, unknown> },
): SafeVehicleOccurrence {
  return {
    recordId: record.id,
    maskedOccurrenceNumber: maskOccurrenceNumber(
      firstText(record.fields, ["Número da Ocorrência", "Número", "Referência"]),
    ),
    occurredAt: firstText(record.fields, ["Data e Hora", "Data", "Data da Ocorrência"]) || null,
    category: firstText(record.fields, ["Categoria", "Natureza", "Tipo"]) || null,
    status: firstText(record.fields, ["Situação", "Status"]) || null,
  };
}
