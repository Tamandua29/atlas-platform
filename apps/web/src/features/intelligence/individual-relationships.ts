import "server-only";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

type RelationshipFields = {
  "Pessoa de Origem"?: string[];
  "Pessoa de Destino"?: string[];
  "Tipo de Relacionamento"?: string;
  Confiabilidade?: string;
  "Situação da Verificação"?: string;
  "Data da Informação"?: string;
  "Categoria de Risco do Relacionamento"?: string;
  "Classificação da Informação"?: string;
  Fonte?: string;
  "Registro Ativo"?: boolean;
};

type IndividualFields = {
  "Nome Completo"?: string;
  "Vulgo Principal"?: string;
};

export type IndividualRelationship = {
  relationshipRecordId: string;
  counterpartRecordId: string;
  counterpartName: string;
  counterpartAlias: string | null;
  direction: "origin" | "destination";
  relationshipType: string;
  confidence: string | null;
  verificationStatus: string | null;
  informationDate: string | null;
  riskCategory: string | null;
  informationClassification: string | null;
  sourceRegistered: boolean;
};

const relationshipFields = [
  "Pessoa de Origem",
  "Pessoa de Destino",
  "Tipo de Relacionamento",
  "Confiabilidade",
  "Situação da Verificação",
  "Data da Informação",
  "Categoria de Risco do Relacionamento",
  "Classificação da Informação",
  "Fonte",
  "Registro Ativo",
];

const individualFields = ["Nome Completo", "Vulgo Principal"];

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function listRelationshipsForIndividual(
  individualRecordId: string,
): Promise<IndividualRelationship[]> {
  if (!/^rec[a-zA-Z0-9]+$/.test(individualRecordId)) return [];

  const configuration = getAirtableConfiguration();
  const relationships = await listAllAirtableRecords<RelationshipFields>(
    configuration.relationshipsTableId,
    {
      baseId: configuration.baseId,
      fields: relationshipFields,
      maxRecords: 200,
    },
  );

  const relevant = relationships
    .filter((record) => record.fields["Registro Ativo"] !== false)
    .flatMap((record) => {
      const origins = record.fields["Pessoa de Origem"] || [];
      const destinations = record.fields["Pessoa de Destino"] || [];
      const matchesOrigin = origins.includes(individualRecordId);
      const matchesDestination = destinations.includes(individualRecordId);

      if (!matchesOrigin && !matchesDestination) return [];

      const counterparts = matchesOrigin
        ? destinations.map((counterpartRecordId) => ({
            counterpartRecordId,
            direction: "origin" as const,
          }))
        : origins.map((counterpartRecordId) => ({
            counterpartRecordId,
            direction: "destination" as const,
          }));

      return counterparts
        .filter(
          ({ counterpartRecordId }) =>
            counterpartRecordId !== individualRecordId,
        )
        .map((counterpart) => ({ record, ...counterpart }));
    });

  if (relevant.length === 0) return [];

  const counterpartIds = new Set(
    relevant.map(({ counterpartRecordId }) => counterpartRecordId),
  );
  const individuals = await listAllAirtableRecords<IndividualFields>(
    configuration.individualsTableId,
    {
      baseId: configuration.baseId,
      fields: individualFields,
      maxRecords: 500,
    },
  );
  const individualsById = new Map(
    individuals
      .filter((record) => counterpartIds.has(record.id))
      .map((record) => [record.id, record.fields]),
  );

  return relevant
    .map(({ record, counterpartRecordId, direction }) => {
      const counterpart = individualsById.get(counterpartRecordId);
      if (!counterpart) return null;

      return {
        relationshipRecordId: record.id,
        counterpartRecordId,
        counterpartName:
          text(counterpart["Nome Completo"]) || "Pessoa não identificada",
        counterpartAlias: text(counterpart["Vulgo Principal"]) || null,
        direction,
        relationshipType:
          text(record.fields["Tipo de Relacionamento"]) || "Vínculo registrado",
        confidence: text(record.fields.Confiabilidade) || null,
        verificationStatus:
          text(record.fields["Situação da Verificação"]) || null,
        informationDate: text(record.fields["Data da Informação"]) || null,
        riskCategory:
          text(record.fields["Categoria de Risco do Relacionamento"]) || null,
        informationClassification:
          text(record.fields["Classificação da Informação"]) || null,
        sourceRegistered: Boolean(text(record.fields.Fonte)),
      };
    })
    .filter(
      (relationship): relationship is IndividualRelationship =>
        relationship !== null,
    )
    .sort((left, right) =>
      left.counterpartName.localeCompare(right.counterpartName, "pt-BR"),
    );
}
