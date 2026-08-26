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
  "Registro Ativo"?: boolean;
};

export type OrganizationDirectoryEntry = {
  recordId: string;
  name: string;
  acronym: string | null;
  organizationType: string | null;
  organizationStatus: string | null;
  explicitLinkCount: number;
  linkedIndividualCount: number;
};

const organizationFields = ["Nome da Organização", "Sigla", "Tipo", "Situação"];
const linkFields = ["Organização", "Indivíduo", "Registro Ativo"];

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function listOrganizationDirectory(
  limit = 100,
): Promise<OrganizationDirectoryEntry[]> {
  const configuration = getAirtableConfiguration();
  const [organizations, links] = await Promise.all([
    listAllAirtableRecords<OrganizationFields>(
      configuration.organizationsTableId,
      {
        baseId: configuration.baseId,
        fields: organizationFields,
        maxRecords: Math.min(Math.max(limit, 1), 200),
      },
    ),
    listAllAirtableRecords<OrganizationalLinkFields>(
      configuration.organizationalLinksTableId,
      {
        baseId: configuration.baseId,
        fields: linkFields,
        maxRecords: 500,
      },
    ),
  ]);

  const activeLinks = links.filter(
    (record) => record.fields["Registro Ativo"] !== false,
  );

  return organizations
    .map((organization) => {
      const organizationLinks = activeLinks.filter((link) =>
        link.fields.Organização?.includes(organization.id),
      );
      const linkedIndividuals = new Set(
        organizationLinks.flatMap((link) => link.fields.Indivíduo || []),
      );

      return {
        recordId: organization.id,
        name:
          text(organization.fields["Nome da Organização"]) ||
          "Organização não identificada",
        acronym: text(organization.fields.Sigla) || null,
        organizationType: text(organization.fields.Tipo) || null,
        organizationStatus: text(organization.fields.Situação) || null,
        explicitLinkCount: organizationLinks.length,
        linkedIndividualCount: linkedIndividuals.size,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
}
