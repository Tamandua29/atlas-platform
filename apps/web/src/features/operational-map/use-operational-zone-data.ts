"use client";

import { useEffect, useState } from "react";

import { DEMO_OPERATIONAL_ZONES } from "./operational-map.zones";
import {
  fetchOperationalZones,
  type OperationalZoneSource,
} from "./operational-zones.client";
import type { OperationalZone } from "./operational-map.types";

export function useOperationalZoneData() {
  const [zones, setZones] = useState<OperationalZone[]>(DEMO_OPERATIONAL_ZONES);
  const [source, setSource] =
    useState<OperationalZoneSource>("synthetic-fallback");

  useEffect(() => {
    const controller = new AbortController();
    void fetchOperationalZones(controller.signal)
      .then((result) => {
        setZones(result.zones);
        setSource(result.source);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setZones(DEMO_OPERATIONAL_ZONES);
        setSource("synthetic-fallback");
      });
    return () => controller.abort();
  }, []);

  return { zones, source };
}
