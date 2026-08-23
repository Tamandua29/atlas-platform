import {
  DEFAULT_OPERATIONAL_MAP_FILTERS,
  type OperationalMapFilters,
  type OperationalMapPeriod,
} from "./operational-map.search";
import type {
  OperationalEntityType,
  OperationalLayerVisibility,
  OperationalPriority,
} from "./operational-map.types";

const ENTITY_TYPES: OperationalEntityType[] = [
  "occurrence",
  "person",
  "vehicle",
  "address",
  "organization",
  "point-of-sale",
  "alert",
];
const PRIORITIES: OperationalPriority[] = ["normal", "medium", "high"];
const PERIODS: OperationalMapPeriod[] = ["all", "24h", "7d", "30d"];
const OPAQUE_RECORD_ID = /^[A-Za-z0-9_-]{3,80}$/;
const SAFE_STATUS = /^[\p{L}\p{N} _-]{1,50}$/u;

export type OperationalMapUrlState = {
  filters: OperationalMapFilters;
  layers: OperationalLayerVisibility;
  heatmapEnabled: boolean;
  zonesEnabled: boolean;
  connectionsEnabled: boolean;
  focusRecordId: string | null;
};

export const DEFAULT_OPERATIONAL_MAP_URL_STATE: OperationalMapUrlState = {
  filters: { ...DEFAULT_OPERATIONAL_MAP_FILTERS },
  layers: {
    occurrence: true,
    person: true,
    vehicle: true,
    address: true,
    organization: true,
    "point-of-sale": true,
    alert: true,
  },
  heatmapEnabled: false,
  zonesEnabled: false,
  connectionsEnabled: true,
  focusRecordId: null,
};

function isOneOf<T extends string>(
  value: string | null,
  options: T[],
): value is T {
  return value !== null && options.includes(value as T);
}

export function parseOperationalMapUrlState(
  params: URLSearchParams,
): OperationalMapUrlState {
  const entityType = params.get("type");
  const priority = params.get("priority");
  const period = params.get("period");
  const status = params.get("status");
  const focusRecordId = params.get("focusRecordId");
  const hidden = new Set(
    (params.get("hidden") ?? "")
      .split(",")
      .filter((value): value is OperationalEntityType =>
        isOneOf(value, ENTITY_TYPES),
      ),
  );

  return {
    filters: {
      entityType:
        entityType === "all" || isOneOf(entityType, ENTITY_TYPES)
          ? entityType
          : "all",
      priority:
        priority === "all" || isOneOf(priority, PRIORITIES) ? priority : "all",
      status:
        status && SAFE_STATUS.test(status)
          ? status
          : DEFAULT_OPERATIONAL_MAP_FILTERS.status,
      period: isOneOf(period, PERIODS) ? period : "all",
    },
    layers: Object.fromEntries(
      ENTITY_TYPES.map((type) => [type, !hidden.has(type)]),
    ) as OperationalLayerVisibility,
    heatmapEnabled: params.get("heatmap") === "1",
    zonesEnabled: params.get("zones") === "1",
    connectionsEnabled: params.get("connections") !== "0",
    focusRecordId:
      focusRecordId && OPAQUE_RECORD_ID.test(focusRecordId)
        ? focusRecordId
        : null,
  };
}

export function buildOperationalMapSearchParams(
  state: OperationalMapUrlState,
): URLSearchParams {
  const params = new URLSearchParams();

  if (state.filters.entityType !== "all") {
    params.set("type", state.filters.entityType);
  }
  if (state.filters.priority !== "all") {
    params.set("priority", state.filters.priority);
  }
  if (
    state.filters.status !== DEFAULT_OPERATIONAL_MAP_FILTERS.status &&
    SAFE_STATUS.test(state.filters.status)
  ) {
    params.set("status", state.filters.status);
  }
  if (state.filters.period !== "all") {
    params.set("period", state.filters.period);
  }

  const hidden = ENTITY_TYPES.filter((type) => !state.layers[type]);
  if (hidden.length > 0) params.set("hidden", hidden.join(","));
  if (state.heatmapEnabled) params.set("heatmap", "1");
  if (state.zonesEnabled) params.set("zones", "1");
  if (!state.connectionsEnabled) params.set("connections", "0");
  if (state.focusRecordId && OPAQUE_RECORD_ID.test(state.focusRecordId)) {
    params.set("focusRecordId", state.focusRecordId);
  }

  return params;
}
