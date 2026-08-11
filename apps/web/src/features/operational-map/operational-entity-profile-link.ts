import type { OperationalEntity } from "./operational-map.types";

const AIRTABLE_RECORD_ID_PATTERN = /^rec[A-Za-z0-9]{14,}$/;

type ProfileLinkEntity = Pick<OperationalEntity, "reference" | "type">;

export function getOperationalEntityProfileHref(
  entity: ProfileLinkEntity,
): string | null {
  if (!AIRTABLE_RECORD_ID_PATTERN.test(entity.reference)) {
    return null;
  }

  if (entity.type === "person") {
    return `/intelligence/individuals/${entity.reference}`;
  }

  if (entity.type === "vehicle") {
    return `/intelligence/vehicles/${entity.reference}`;
  }

  if (entity.type === "organization") {
    return `/intelligence/organizations/${entity.reference}`;
  }

  return null;
}
