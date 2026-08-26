import "server-only";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

type AirtableAttachment = {
  id?: string;
  url?: string;
  filename?: string;
  type?: string;
  width?: number;
  height?: number;
  thumbnails?: {
    small?: { url?: string };
    large?: { url?: string };
    full?: { url?: string };
  };
};

type EvidenceFields = {
  "Título da Evidência"?: string;
  "Tipo de Evidência"?: string;
  "Arquivo ou Mídia"?: AirtableAttachment[];
  "Data e Hora da Obtenção"?: string;
  "Situação da Verificação"?: string;
  "Indivíduos Relacionados"?: string[];
  "Registro Ativo"?: boolean;
};

export type IndividualPhoto = {
  evidenceRecordId: string;
  attachmentId: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  capturedAt: string | null;
  verificationStatus: string | null;
  width: number | null;
  height: number | null;
};

const allowedEvidenceTypes = new Set(["Fotografia", "Imagem de câmera"]);

export async function listPhotosForIndividual(
  recordId: string,
): Promise<IndividualPhoto[]> {
  if (!/^rec[a-zA-Z0-9]+$/.test(recordId)) return [];

  const configuration = getAirtableConfiguration();
  const records = await listAllAirtableRecords<EvidenceFields>(
    configuration.evidenceTableId,
    {
      baseId: configuration.baseId,
      fields: [
        "Título da Evidência",
        "Tipo de Evidência",
        "Arquivo ou Mídia",
        "Data e Hora da Obtenção",
        "Situação da Verificação",
        "Indivíduos Relacionados",
        "Registro Ativo",
      ],
      maxRecords: 100,
    },
  );

  return records.flatMap((record) => {
    if (record.fields["Registro Ativo"] === false) return [];
    if (!record.fields["Indivíduos Relacionados"]?.includes(recordId))
      return [];
    const type = record.fields["Tipo de Evidência"]?.trim();
    if (!type || !allowedEvidenceTypes.has(type)) return [];

    return (record.fields["Arquivo ou Mídia"] || []).flatMap(
      (attachment, index) => {
        if (!attachment.url || !attachment.type?.startsWith("image/"))
          return [];

        return [
          {
            evidenceRecordId: record.id,
            attachmentId: attachment.id || `${record.id}-${index}`,
            title: record.fields["Título da Evidência"]?.trim() || type,
            url: attachment.url,
            thumbnailUrl:
              attachment.thumbnails?.large?.url ||
              attachment.thumbnails?.full?.url ||
              attachment.thumbnails?.small?.url ||
              attachment.url,
            capturedAt: record.fields["Data e Hora da Obtenção"] || null,
            verificationStatus:
              record.fields["Situação da Verificação"]?.trim() || null,
            width: attachment.width || null,
            height: attachment.height || null,
          },
        ];
      },
    );
  });
}
