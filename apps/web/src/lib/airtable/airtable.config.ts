import "server-only";

type AirtableConfiguration = {
  accessToken: string;
  baseId: string;
  occurrencesTableId: string;
  addressesTableId: string;
  individualsTableId: string;
};

function getRequiredEnvironmentVariable(
  variableName: string,
): string {
  const value = process.env[variableName]?.trim();

  if (!value) {
    throw new Error(
      `A variável ${variableName} não foi configurada.`,
    );
  }

  return value;
}

export function getAirtableConfiguration(): AirtableConfiguration {
  return {
    accessToken: getRequiredEnvironmentVariable(
      "AIRTABLE_ACCESS_TOKEN",
    ),

    baseId: getRequiredEnvironmentVariable(
      "AIRTABLE_BASE_ID",
    ),

    occurrencesTableId: getRequiredEnvironmentVariable(
      "AIRTABLE_OCCURRENCES_TABLE_ID",
    ),

    addressesTableId: getRequiredEnvironmentVariable(
      "AIRTABLE_ADDRESSES_TABLE_ID",
    ),

    individualsTableId: getRequiredEnvironmentVariable(
      "AIRTABLE_INDIVIDUALS_TABLE_ID",
    ),
  };
}