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
  baseId?: string;
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
      `${options.baseId ?? configuration.baseId}/` +
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

export async function createAirtableRecord<RecordFields>(
  tableId: string,
  fields: RecordFields,
  options: { baseId?: string } = {},
): Promise<AirtableRecord<RecordFields>> {
  const configuration =
    getAirtableConfiguration();

  const endpoint =
    `${AIRTABLE_API_URL}/` +
    `${options.baseId ?? configuration.baseId}/` +
    tableId;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization:
        `Bearer ${configuration.accessToken}`,
      Accept: "application/json",
      "Content-Type":
        "application/json",
    },
    body: JSON.stringify({
      records: [{ fields }],
      typecast: false,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Falha ao criar registro no Airtable: ${response.status} ${await response.text()}`,
    );
  }

  const payload = await response.json() as {
    records: AirtableRecord<RecordFields>[];
  };

  const record = payload.records[0];

  if (!record) {
    throw new Error(
      "O Airtable não retornou o registro criado.",
    );
  }

  return record;
}

export async function updateAirtableRecord<RecordFields>(
  tableId: string,
  recordId: string,
  fields: Partial<RecordFields>,
): Promise<AirtableRecord<RecordFields>> {
  const configuration =
    getAirtableConfiguration();

  const endpoint =
    `${AIRTABLE_API_URL}/` +
    `${configuration.baseId}/` +
    tableId;

  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: {
      Authorization:
        `Bearer ${configuration.accessToken}`,
      Accept: "application/json",
      "Content-Type":
        "application/json",
    },
    body: JSON.stringify({
      records: [
        {
          id: recordId,
          fields,
        },
      ],
      typecast: false,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Falha ao atualizar registro no Airtable: ${response.status} ${await response.text()}`,
    );
  }

  const payload = await response.json() as {
    records: AirtableRecord<RecordFields>[];
  };

  const record = payload.records[0];

  if (!record) {
    throw new Error(
      "O Airtable não retornou o registro atualizado.",
    );
  }

  return record;
}
