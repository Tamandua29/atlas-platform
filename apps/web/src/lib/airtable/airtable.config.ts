import "server-only";

type AirtableConfiguration = {
  accessToken: string;
  baseId: string;
  occurrencesTableId: string;
  organizationsTableId: string;
  organizationalLinksTableId: string;
  relationshipsTableId: string;
  documentsTableId: string;
  addressesTableId: string;
  phonesTableId: string;
  vehiclesTableId: string;
  warrantsTableId: string;
  evidenceTableId: string;
  individualsTableId: string;
  individualsPreviewBaseId: string;
};

function getRequiredEnvironmentVariable(variableName: string): string {
  const value = process.env[variableName]?.trim();

  if (!value) {
    throw new Error(`A variável ${variableName} não foi configurada.`);
  }

  return value;
}

export function getAirtableConfiguration(): AirtableConfiguration {
  return {
    accessToken: getRequiredEnvironmentVariable("AIRTABLE_ACCESS_TOKEN"),

    baseId: getRequiredEnvironmentVariable("AIRTABLE_BASE_ID"),

    occurrencesTableId: getRequiredEnvironmentVariable(
      "AIRTABLE_OCCURRENCES_TABLE_ID",
    ),

    organizationsTableId: getRequiredEnvironmentVariable(
      "AIRTABLE_ORGANIZATIONS_TABLE_ID",
    ),

    organizationalLinksTableId: getRequiredEnvironmentVariable(
      "AIRTABLE_ORGANIZATIONAL_LINKS_TABLE_ID",
    ),

    relationshipsTableId: getRequiredEnvironmentVariable(
      "AIRTABLE_RELATIONSHIPS_TABLE_ID",
    ),

    documentsTableId: getRequiredEnvironmentVariable(
      "AIRTABLE_DOCUMENTS_TABLE_ID",
    ),

    addressesTableId: getRequiredEnvironmentVariable(
      "AIRTABLE_ADDRESSES_TABLE_ID",
    ),

    phonesTableId: getRequiredEnvironmentVariable("AIRTABLE_PHONES_TABLE_ID"),

    vehiclesTableId: getRequiredEnvironmentVariable(
      "AIRTABLE_VEHICLES_TABLE_ID",
    ),

    warrantsTableId: getRequiredEnvironmentVariable(
      "AIRTABLE_WARRANTS_TABLE_ID",
    ),

    evidenceTableId: getRequiredEnvironmentVariable(
      "AIRTABLE_EVIDENCE_TABLE_ID",
    ),

    individualsTableId: getRequiredEnvironmentVariable(
      "AIRTABLE_INDIVIDUALS_TABLE_ID",
    ),

    individualsPreviewBaseId:
      process.env.AIRTABLE_INDIVIDUALS_PREVIEW_BASE_ID?.trim() ||
      getRequiredEnvironmentVariable("AIRTABLE_BASE_ID"),
  };
}
