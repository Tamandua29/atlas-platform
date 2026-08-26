import { NextResponse } from "next/server";

import { loadOperationalEntitiesFromAirtable } from "@/features/operational-map/operational-map.airtable-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const entities = await loadOperationalEntitiesFromAirtable();

    return NextResponse.json({
      success: true,
      count: entities.length,
      entities,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Falha ao carregar entidades operacionais:", error);

    return NextResponse.json(
      {
        success: false,
        count: 0,
        entities: [],
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao carregar as entidades operacionais.",
      },
      {
        status: 500,
      },
    );
  }
}
