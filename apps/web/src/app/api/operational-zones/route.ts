import { NextResponse } from "next/server";

import { loadOperationalZonesFromAirtable } from "@/features/operational-map/operational-zones.airtable-repository";
import { DEMO_OPERATIONAL_ZONES } from "@/features/operational-map/operational-map.zones";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const configured = Boolean(
      process.env.AIRTABLE_OPERATIONAL_ZONES_TABLE_ID?.trim(),
    );
    const persistedZones = configured
      ? await loadOperationalZonesFromAirtable()
      : [];
    const useFallback = !configured;
    const zones = useFallback ? DEMO_OPERATIONAL_ZONES : persistedZones;

    return NextResponse.json({
      success: true,
      mode: "read-only",
      source: useFallback ? "synthetic-fallback" : "airtable",
      count: zones.length,
      zones,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Falha ao carregar áreas operacionais:", error);
    return NextResponse.json(
      {
        success: false,
        count: 0,
        zones: [],
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao carregar áreas operacionais.",
      },
      { status: 500 },
    );
  }
}
