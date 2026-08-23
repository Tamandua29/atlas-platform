import { AuditEntry } from "@atlas/kernel";
import { NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import { buildOperationalDashboard } from "@/features/operational-dashboard/operational-dashboard";
import { loadOperationalEntitiesFromAirtable } from "@/features/operational-map/operational-map.airtable-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const authorization = await authorizeAtlas(["reviewer", "auditor"]);
  if (!authorization.authorized) return authorization.response;

  const { session } = authorization;
  const correlationId = crypto.randomUUID();

  try {
    const entities = await loadOperationalEntitiesFromAirtable();
    const summary = buildOperationalDashboard(entities);
    const auditPersisted = await persistAuditSafely(
      AuditEntry.create({
        action: "operational.dashboard.view",
        outcome: "success",
        occurredAt: new Date(),
        correlationId,
        processedCount: entities.length,
        successCount: entities.length,
        metadata: {
          actorId: session.actorId,
          actorRole: session.role,
          mode: "aggregate-operational-dashboard",
        },
      }),
    );

    return NextResponse.json(
      {
        success: true,
        auditPersisted,
        correlationId,
        mode: "aggregate-operational-dashboard",
        summary,
        generatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Falha ao carregar painel operacional:", error);
    const auditPersisted = await persistAuditSafely(
      AuditEntry.create({
        action: "operational.dashboard.view",
        outcome: "failure",
        occurredAt: new Date(),
        correlationId,
        processedCount: 0,
        failureCount: 1,
        metadata: {
          actorId: session.actorId,
          actorRole: session.role,
          mode: "aggregate-operational-dashboard",
        },
      }),
    );

    return NextResponse.json(
      {
        success: false,
        auditPersisted,
        correlationId,
        message: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      { status: 500 },
    );
  }
}
