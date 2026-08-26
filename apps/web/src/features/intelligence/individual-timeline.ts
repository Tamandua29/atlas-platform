export type IndividualTimelineEvent = {
  id: string;
  occurredAt: string;
  category:
    | "occurrence"
    | "warrant"
    | "document"
    | "photo"
    | "vehicle"
    | "phone"
    | "relationship";
  title: string;
  summary: string | null;
};

type TimelineSources = {
  occurrences: Array<{
    recordId: string;
    occurredAt: string | null;
    nature: string | null;
    category: string | null;
    maskedOccurrenceNumber: string;
  }>;
  warrants: Array<{
    recordId: string;
    issuedAt: string | null;
    expiresAt: string | null;
    type: string | null;
    maskedWarrantNumber: string;
  }>;
  documents: Array<{
    recordId: string;
    documentDate: string | null;
    title: string;
    documentType: string | null;
  }>;
  photos: Array<{
    evidenceRecordId: string;
    attachmentId: string;
    capturedAt: string | null;
    title: string;
  }>;
  vehicles: Array<{
    recordId: string;
    informationDate: string | null;
    brand: string | null;
    model: string | null;
    relationshipType: string | null;
  }>;
  phones: Array<{
    recordId: string;
    informationDate: string | null;
    type: string | null;
    carrier: string | null;
  }>;
  personalRelationships: Array<{
    relationshipRecordId: string;
    informationDate: string | null;
    relationshipType: string;
    counterpartName: string;
  }>;
};

function validDate(value: string | null): value is string {
  return Boolean(value && !Number.isNaN(Date.parse(value)));
}

export function buildIndividualTimeline(
  sources: TimelineSources,
): IndividualTimelineEvent[] {
  const events: IndividualTimelineEvent[] = [];

  for (const occurrence of sources.occurrences) {
    if (!validDate(occurrence.occurredAt)) continue;
    events.push({
      id: `occurrence:${occurrence.recordId}`,
      occurredAt: occurrence.occurredAt,
      category: "occurrence",
      title:
        occurrence.nature || occurrence.category || "Ocorrência registrada",
      summary: occurrence.maskedOccurrenceNumber,
    });
  }

  for (const warrant of sources.warrants) {
    if (validDate(warrant.issuedAt)) {
      events.push({
        id: `warrant-issued:${warrant.recordId}`,
        occurredAt: warrant.issuedAt,
        category: "warrant",
        title: warrant.type || "Mandado emitido",
        summary: warrant.maskedWarrantNumber,
      });
    }
    if (validDate(warrant.expiresAt)) {
      events.push({
        id: `warrant-expiry:${warrant.recordId}`,
        occurredAt: warrant.expiresAt,
        category: "warrant",
        title: "Validade de mandado",
        summary: warrant.maskedWarrantNumber,
      });
    }
  }

  for (const document of sources.documents) {
    if (!validDate(document.documentDate)) continue;
    events.push({
      id: `document:${document.recordId}`,
      occurredAt: document.documentDate,
      category: "document",
      title: document.title,
      summary: document.documentType,
    });
  }

  for (const photo of sources.photos) {
    if (!validDate(photo.capturedAt)) continue;
    events.push({
      id: `photo:${photo.evidenceRecordId}:${photo.attachmentId}`,
      occurredAt: photo.capturedAt,
      category: "photo",
      title: "Imagem obtida",
      summary: photo.title,
    });
  }

  for (const vehicle of sources.vehicles) {
    if (!validDate(vehicle.informationDate)) continue;
    events.push({
      id: `vehicle:${vehicle.recordId}`,
      occurredAt: vehicle.informationDate,
      category: "vehicle",
      title: "Informação de veículo registrada",
      summary:
        [vehicle.brand, vehicle.model, vehicle.relationshipType]
          .filter(Boolean)
          .join(" — ") || null,
    });
  }

  for (const phone of sources.phones) {
    if (!validDate(phone.informationDate)) continue;
    events.push({
      id: `phone:${phone.recordId}`,
      occurredAt: phone.informationDate,
      category: "phone",
      title: "Informação telefônica registrada",
      summary: [phone.type, phone.carrier].filter(Boolean).join(" — ") || null,
    });
  }

  for (const relationship of sources.personalRelationships) {
    if (!validDate(relationship.informationDate)) continue;
    events.push({
      id: `relationship:${relationship.relationshipRecordId}`,
      occurredAt: relationship.informationDate,
      category: "relationship",
      title: relationship.relationshipType,
      summary: relationship.counterpartName,
    });
  }

  return events.sort((left, right) => {
    const byDate = Date.parse(right.occurredAt) - Date.parse(left.occurredAt);
    return byDate || left.id.localeCompare(right.id);
  });
}
