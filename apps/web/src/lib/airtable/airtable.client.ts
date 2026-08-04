import "server-only";

import { getAirtableConfiguration } from "./airtable.config";

type AirtableRecord<RecordFields> = {
  id: string;
  createdTime: string;
  fields: RecordFields;
};

type AirtableListResponse<RecordFields> = {
  records: AirtableRecord<RecordFields>[];
  offset?: string;
};

type AirtableListOptions = {
  fields?: string[];
  filterByFormula?: string;
  sort?: Array<{
    field: string;
    direction: "asc" | "desc";
  }>;
  maxRecords?: number;
};

const AIRTABLE_API_URL = "https://api.airtable.com/v0";
const AIRTABLE_PAGE_SIZE = 100;

function appendListOptions(
  searchParams: URLSearchParams,
  options: AirtableListOptions,
) {
  searchParams.set(
    "pageSize",
    String(AIRTABLE_PAGE_SIZE),
  );

  options.fields?.forEach((field) => {
    searchParams.append("fields[]", field);
  });

  if (options.filterByFormula) {
    searchParams.set(
      "filterByFormula",
      options.filterByFormula,
    );
  }

  options.sort?.forEach((sort, index) => {
    searchParams.set(
      `sort[${index}][field]`,
      sort.field,
    );

    searchParams.set(
      `sort[${index}][direction]`,
      sort.direction,
    );
  });
}

export async function listAllAirtableRecords<RecordFields>(
  tableId: string,
  options: AirtableListOptions = {},
): Promise<AirtableRecord<RecordFields>[]> {
  const configuration = getAirtableConfiguration();

  const records: AirtableRecord<RecordFields>[] = [];

  let offset: string | undefined;

  do {
    const searchParams = new URLSearchParams();

    appendListOptions(searchParams, options);

    if (offset) {
      searchParams.set("offset", offset);
    }

    const endpoint =
      `${AIRTABLE_API_URL}/` +
      `${configuration.baseId}/` +
      `${tableId}?` +
      searchParams.toString();

    const response = await fetch(endpoint, {
      method: "GET",

      headers: {
        Authorization: `Bearer ${configuration.accessToken}`,
        Accept: "application/json",
      },

      cache: "no-store",
    });

    if (!response.ok) {
      const responseBody = await response.text();

      throw new Error(
        `Falha ao consultar o Airtable: ` +
          `${response.status} ${response.statusText}. ` +
          responseBody,
      );
    }

    const page =
      (await response.json()) as AirtableListResponse<RecordFields>;

    records.push(...page.records);
    offset = page.offset;

    if (
      options.maxRecords &&
      records.length >= options.maxRecords
    ) {
      return records.slice(
        0,
        options.maxRecords,
      );
    }
  } while (offset);

  return records;
}