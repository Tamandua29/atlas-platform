import { AuditEntry } from "@atlas/kernel";
import { NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import { getIdentificationDashboardMetrics } from "@/features/individuals/duplicate-review-dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const authorization = await authorizeAtlas(["reviewer", "auditor"]);
  if (!authorization.authorized) return authorization.response;

  const { session } = authorization;
  const correlationId = crypto.randomUUID();

  try {
    const metrics = await getIdentificationDashboardMetrics();
    const audit = AuditEntry.create({
      action: "individuals.dashboard.view",
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: metrics.totalReviews,
      successCount: metrics.totalReviews,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        mode: "safe-identification-dashboard",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);

    return NextResponse.json(
      {
        success: true,
        auditPersisted,
        correlationId,
        mode: "safe-identification-dashboard",
        metrics,
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Falha ao carregar painel de identificação:", error);
    const audit = AuditEntry.create({
      action: "individuals.dashboard.view",
      outcome: "failure",
      occurredAt: new Date(),
      correlationId,
      processedCount: 0,
      failureCount: 1,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        mode: "safe-identification-dashboard",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);

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
