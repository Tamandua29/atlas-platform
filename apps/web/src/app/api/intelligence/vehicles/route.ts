import { AuditEntry } from "@atlas/kernel";
import { NextRequest, NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import { listVehicleDirectory } from "@/features/intelligence/vehicle-directory";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await authorizeAtlas(["reviewer", "auditor"]);
  if (!authorization.authorized) return authorization.response;

  const correlationId = crypto.randomUUID();
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") || 100);
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 100;

  try {
    const vehicles = await listVehicleDirectory(limit);
    const auditPersisted = await persistAuditSafely(AuditEntry.create({
      action: "intelligence.vehicles.list",
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: vehicles.length,
      successCount: vehicles.length,
      metadata: {
        actorId: authorization.session.actorId,
        actorRole: authorization.session.role,
        mode: "protected-vehicle-directory",
      },
    }));

    return NextResponse.json(
      { success: true, auditPersisted, correlationId, count: vehicles.length, vehicles },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, correlationId, message: error instanceof Error ? error.message : "Erro desconhecido." },
      { status: 500 },
    );
  }
}
