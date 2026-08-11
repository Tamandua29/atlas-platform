const AIRTABLE_RECORD_ID = /^rec[a-zA-Z0-9]+$/;

export function extractLinkedRecordIds(
  fields: Record<string, unknown>,
): string[] {
  const recordIds = new Set<string>();

  Object.values(fields).forEach((value) => {
    if (!Array.isArray(value)) return;

    value.forEach((item) => {
      if (typeof item === "string" && AIRTABLE_RECORD_ID.test(item)) {
        recordIds.add(item);
      }
    });
  });

  return [...recordIds];
}
