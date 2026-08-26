import "server-only";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

type OrganizationalLinkFields = {
  Indivíduo?: string[];
  Organização?: string[];
  "Função ou Posição"?: string;
  "Tipo de Vínculo"?: string;
  "Situação da Informação"?: string;
  Fonte?: string;
  Confiabilidade?: string;
  "Situação da Verificação"?: string;
  "Registro Ativo"?: boolean;
};

type OrganizationFields = {
  "Nome da Organização"?: string;
  Sigla?: string;
  Tipo?: string;
  Situação?: string;
};

export type IndividualOrganization = {
  linkRecordId: string;
  organizationRecordId: string;
  name: string;
  acronym: string | null;
  organizationType: string | null;
  organizationStatus: string | null;
  role: string | null;
  relationshipType: string | null;
  informationStatus: string | null;
  source: string | null;
  confidence: string | null;
  verificationStatus: string | null;
};

const linkFields = [
  "Indivíduo",
  "Organização",
  "Função ou Posição",
  "Tipo de Vínculo",
  "Situação da Informação",
  "Fonte",
  "Confiabilidade",
  "Situação da Verificação",
  "Registro Ativo",
];

const organizationFields = ["Nome da Organização", "Sigla", "Tipo", "Situação"];

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function listOrganizationsForIndividual(
  individualRecordId: string,
): Promise<IndividualOrganization[]> {
  if (!/^rec[a-zA-Z0-9]+$/.test(individualRecordId)) return [];

  const configuration = getAirtableConfiguration();
  const links = await listAllAirtableRecords<OrganizationalLinkFields>(
    configuration.organizationalLinksTableId,
    {
      baseId: configuration.baseId,
      fields: linkFields,
      maxRecords: 100,
    },
  );

  const relevantLinks = links
    .filter((record) => record.fields["Registro Ativo"] !== false)
    .filter((record) => record.fields.Indivíduo?.includes(individualRecordId))
    .flatMap((record) =>
      (record.fields.Organização || []).map((organizationRecordId) => ({
        record,
        organizationRecordId,
      })),
    );

  if (relevantLinks.length === 0) return [];

  const organizationIds = new Set(
    relevantLinks.map(({ organizationRecordId }) => organizationRecordId),
  );
  const organizations = await listAllAirtableRecords<OrganizationFields>(
    configuration.organizationsTableId,
    {
      baseId: configuration.baseId,
      fields: organizationFields,
      maxRecords: 100,
    },
  );
  const organizationsById = new Map(
    organizations
      .filter((record) => organizationIds.has(record.id))
      .map((record) => [record.id, record.fields]),
  );

  return relevantLinks
    .map(({ record, organizationRecordId }) => {
      const organization = organizationsById.get(organizationRecordId);
      if (!organization) return null;

      return {
        linkRecordId: record.id,
        organizationRecordId,
        name:
          text(organization["Nome da Organização"]) ||
          "Organização não identificada",
        acronym: text(organization.Sigla) || null,
        organizationType: text(organization.Tipo) || null,
        organizationStatus: text(organization.Situação) || null,
        role: text(record.fields["Função ou Posição"]) || null,
        relationshipType: text(record.fields["Tipo de Vínculo"]) || null,
        informationStatus:
          text(record.fields["Situação da Informação"]) || null,
        source: text(record.fields.Fonte) || null,
        confidence: text(record.fields.Confiabilidade) || null,
        verificationStatus:
          text(record.fields["Situação da Verificação"]) || null,
      };
    })
    .filter(
      (organization): organization is IndividualOrganization =>
        organization !== null,
    )
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}
