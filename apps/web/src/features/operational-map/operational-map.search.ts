import { OPERATIONAL_ENTITY_CONFIG } from "./operational-map.data";

import type {
  OperationalEntity,
  OperationalEntityType,
  OperationalPriority,
} from "./operational-map.types";

export type OperationalMapPeriod = "all" | "24h" | "7d" | "30d";

export type OperationalMapFilters = {
  entityType: OperationalEntityType | "all";
  priority: OperationalPriority | "all";
  status: string;
  period: OperationalMapPeriod;
};

export const DEFAULT_OPERATIONAL_MAP_FILTERS: OperationalMapFilters = {
  entityType: "all",
  priority: "all",
  status: "all",
  period: "all",
};

const PERIOD_IN_MILLISECONDS: Record<
  Exclude<OperationalMapPeriod, "all">,
  number
> = {
  "24h": 24 * 60 * 60 * 1_000,
  "7d": 7 * 24 * 60 * 60 * 1_000,
  "30d": 30 * 24 * 60 * 60 * 1_000,
};

export function normalizeOperationalSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

export function matchesOperationalEntitySearch(
  entity: OperationalEntity,
  query: string,
): boolean {
  const normalizedQuery = normalizeOperationalSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  const searchableValues = [
    entity.title,
    entity.reference,
    entity.locationLabel,
    OPERATIONAL_ENTITY_CONFIG[entity.type].label,
  ];

  return searchableValues.some((value) =>
    normalizeOperationalSearchText(value).includes(normalizedQuery),
  );
}

export function filterOperationalEntities(
  entities: OperationalEntity[],
  query: string,
  filters: OperationalMapFilters = DEFAULT_OPERATIONAL_MAP_FILTERS,
  now: Date = new Date(),
): OperationalEntity[] {
  return entities.filter(
    (entity) =>
      matchesOperationalEntitySearch(entity, query) &&
      matchesOperationalEntityFilters(entity, filters, now),
  );
}

export function hasActiveOperationalMapFilters(
  filters: OperationalMapFilters,
): boolean {
  return (
    filters.entityType !== "all" ||
    filters.priority !== "all" ||
    filters.status !== "all" ||
    filters.period !== "all"
  );
}

export function matchesOperationalEntityFilters(
  entity: OperationalEntity,
  filters: OperationalMapFilters,
  now: Date = new Date(),
): boolean {
  if (filters.entityType !== "all" && entity.type !== filters.entityType) {
    return false;
  }

  const priority = entity.priority ?? "normal";

  if (filters.priority !== "all" && priority !== filters.priority) {
    return false;
  }

  if (
    filters.status !== "all" &&
    normalizeOperationalSearchText(entity.status) !==
      normalizeOperationalSearchText(filters.status)
  ) {
    return false;
  }

  if (filters.period === "all") {
    return true;
  }

  const createdAt = new Date(entity.createdAt).getTime();
  const currentTime = now.getTime();

  if (Number.isNaN(createdAt) || Number.isNaN(currentTime)) {
    return false;
  }

  return (
    createdAt <= currentTime &&
    createdAt >= currentTime - PERIOD_IN_MILLISECONDS[filters.period]
  );
}

export function getOperationalStatusOptions(
  entities: OperationalEntity[],
): string[] {
  return Array.from(
    new Map(
      entities
        .filter((entity) => entity.status.trim())
        .map((entity) => [
          normalizeOperationalSearchText(entity.status),
          entity.status.trim(),
        ]),
    ).values(),
  ).sort((left, right) => left.localeCompare(right, "pt-BR"));
}
