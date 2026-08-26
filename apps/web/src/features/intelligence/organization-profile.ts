import "server-only";

import { listAllAirtableRecords } from "@/lib/airtable/airtable.client";
import { getAirtableConfiguration } from "@/lib/airtable/airtable.config";

type OrganizationFields = {
  "Nome da Organização"?: string;
  Sigla?: string;
  Tipo?: string;
  Situação?: string;
};

type OrganizationalLinkFields = {
  Organização?: string[];
  Indivíduo?: string[];
  "Função ou Posição"?: string;
  "Tipo de Vínculo"?: string;
  "Situação da Informação"?: string;
  "Situação da Verificação"?: string;
  "Registro Ativo"?: boolean;
};

type IndividualFields = {
  "Nome Completo"?: string;
  "Vulgo Principal"?: string;
};

export type OrganizationProfileLink = {
  linkRecordId: string;
  individualRecordId: string;
  legalName: string;
  alias: string | null;
  role: string | null;
  relationshipType: string | null;
  informationStatus: string | null;
  verificationStatus: string | null;
};

export type OrganizationProfile = {
  recordId: string;
  name: string;
  acronym: string | null;
  organizationType: string | null;
  organizationStatus: string | null;
  links: OrganizationProfileLink[];
};

const organizationFields = ["Nome da Organização", "Sigla", "Tipo", "Situação"];
const linkFields = [
  "Organização",
  "Indivíduo",
  "Função ou Posição",
  "Tipo de Vínculo",
  "Situação da Informação",
  "Situação da Verificação",
  "Registro Ativo",
];
const individualFields = ["Nome Completo", "Vulgo Principal"];

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function getOrganizationProfile(
  recordId: string,
): Promise<OrganizationProfile | null> {
  const configuration = getAirtableConfiguration();
  const organizations = await listAllAirtableRecords<OrganizationFields>(
    configuration.organizationsTableId,
    {
      baseId: configuration.baseId,
      fields: organizationFields,
      filterByFormula: `RECORD_ID()='${recordId}'`,
      maxRecords: 1,
    },
  );
  const organization = organizations[0];
  if (!organization) return null;

  const allLinks = await listAllAirtableRecords<OrganizationalLinkFields>(
    configuration.organizationalLinksTableId,
    {
      baseId: configuration.baseId,
      fields: linkFields,
      maxRecords: 500,
    },
  );
  const links = allLinks.filter(
    (link) =>
      link.fields["Registro Ativo"] !== false &&
      (link.fields.Organização || []).includes(recordId),
  );
  const individualIds = new Set(
    links.flatMap((link) => link.fields.Indivíduo || []),
  );

  const individuals = individualIds.size
    ? await listAllAirtableRecords<IndividualFields>(
        configuration.individualsTableId,
        {
          baseId: configuration.individualsPreviewBaseId,
          fields: individualFields,
          maxRecords: 500,
        },
      )
    : [];
  const individualsById = new Map(
    individuals
      .filter((individual) => individualIds.has(individual.id))
      .map((individual) => [individual.id, individual]),
  );

  const profileLinks = links.flatMap((link) =>
    (link.fields.Indivíduo || []).flatMap((individualRecordId) => {
      const individual = individualsById.get(individualRecordId);
      if (!individual) return [];
      return [
        {
          linkRecordId: link.id,
          individualRecordId,
          legalName:
            text(individual.fields["Nome Completo"]) || "Nome protegido",
          alias: text(individual.fields["Vulgo Principal"]) || null,
          role: text(link.fields["Função ou Posição"]) || null,
          relationshipType: text(link.fields["Tipo de Vínculo"]) || null,
          informationStatus:
            text(link.fields["Situação da Informação"]) || null,
          verificationStatus:
            text(link.fields["Situação da Verificação"]) || null,
        },
      ];
    }),
  );

  return {
    recordId: organization.id,
    name:
      text(organization.fields["Nome da Organização"]) ||
      "Organização sem nome",
    acronym: text(organization.fields.Sigla) || null,
    organizationType: text(organization.fields.Tipo) || null,
    organizationStatus: text(organization.fields.Situação) || null,
    links: profileLinks.sort((left, right) =>
      left.legalName.localeCompare(right.legalName, "pt-BR"),
    ),
  };
}
