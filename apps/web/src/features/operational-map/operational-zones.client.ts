import type { OperationalZone } from "./operational-map.types";

export type OperationalZoneSource = "airtable" | "synthetic-fallback";

type ResponseBody = {
  success: boolean;
  source?: OperationalZoneSource;
  zones: OperationalZone[];
  message?: string;
};

export async function fetchOperationalZones(signal?: AbortSignal) {
  const response = await fetch("/api/operational-zones", {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal,
  });
  const body = (await response.json()) as ResponseBody;
  if (!response.ok || !body.success || !body.source) {
    throw new Error(body.message ?? "Não foi possível carregar as áreas operacionais.");
  }
  return { zones: body.zones, source: body.source };
}
