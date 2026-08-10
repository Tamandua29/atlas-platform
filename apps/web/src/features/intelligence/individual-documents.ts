import "server-only";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

type Attachment = {
  id?: string;
};

type DocumentFields = {
  "ID Documento"?: string;
  "Indivíduo"?: string[];
  "Título"?: string;
  "Tipo de Documento"?: string;
  "Arquivo"?: Attachment[];
  "Data do Documento"?: string;
  "Órgão de Origem"?: string;
  "Classificação da Informação"?: string;
  "Ocorrências"?: string[];
  "Situação da Verificação"?: string;
  "Registro Ativo"?: boolean;
  "Evidências"?: string[];
};

export type IndividualDocument = {
  recordId: string;
  documentReference: string;
  title: string;
  documentType: string | null;
  documentDate: string | null;
  originAgency: string | null;
  informationClassification: string | null;
  verificationStatus: string | null;
  protectedAttachmentCount: number;
  occurrenceReferenceCount: number;
  evidenceReferenceCount: number;
};

const fields = [
  "ID Documento",
  "Indivíduo",
  "Título",
  "Tipo de Documento",
  "Arquivo",
  "Data do Documento",
  "Órgão de Origem",
  "Classificação da Informação",
  "Ocorrências",
  "Situação da Verificação",
  "Registro Ativo",
  "Evidências",
];

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function count(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

export async function listDocumentsForIndividual(
  individualRecordId: string,
): Promise<IndividualDocument[]> {
  if (!/^rec[a-zA-Z0-9]+$/.test(individualRecordId)) return [];

  const configuration = getAirtableConfiguration();
  const records = await listAllAirtableRecords<DocumentFields>(
    configuration.documentsTableId,
    {
      baseId: configuration.baseId,
      fields,
      maxRecords: 200,
    },
  );

  return records
    .filter((record) => record.fields["Registro Ativo"] !== false)
    .filter((record) => (record.fields["Indivíduo"] || []).includes(individualRecordId))
    .map((record) => ({
      recordId: record.id,
      documentReference: text(record.fields["ID Documento"]) || record.id,
      title: text(record.fields["Título"]) || "Documento sem título",
      documentType: text(record.fields["Tipo de Documento"]) || null,
      documentDate: text(record.fields["Data do Documento"]) || null,
      originAgency: text(record.fields["Órgão de Origem"]) || null,
      informationClassification: text(record.fields["Classificação da Informação"]) || null,
      verificationStatus: text(record.fields["Situação da Verificação"]) || null,
      protectedAttachmentCount: count(record.fields.Arquivo),
      occurrenceReferenceCount: count(record.fields.Ocorrências),
      evidenceReferenceCount: count(record.fields.Evidências),
    }))
    .sort((left, right) => {
      const byDate = (right.documentDate || "").localeCompare(left.documentDate || "");
      return byDate || left.title.localeCompare(right.title, "pt-BR");
    });
}
