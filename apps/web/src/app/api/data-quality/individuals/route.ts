import { AuditEntry } from "@atlas/kernel";
import { NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import { getIndividualDataQualityMetrics } from "@/features/individuals/individual-data-quality";

export const dynamic = "force-dynamic";

export async function GET() {
  const authorization = await authorizeAtlas(["reviewer", "auditor"]);
  if (!authorization.authorized) return authorization.response;

  const { session } = authorization;
  const correlationId = crypto.randomUUID();

  try {
    const metrics = await getIndividualDataQualityMetrics();
    const audit = AuditEntry.create({
      action: "individuals.data-quality.view",
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: metrics.totalRecords,
      successCount: metrics.totalRecords,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        mode: "read-only-aggregate-quality",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);

    return NextResponse.json(
      {
        success: true,
        auditPersisted,
        correlationId,
        mode: "read-only-aggregate-quality",
        writesPerformed: 0,
        metrics,
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Falha ao analisar qualidade dos indivíduos:", error);
    const audit = AuditEntry.create({
      action: "individuals.data-quality.view",
      outcome: "failure",
      occurredAt: new Date(),
      correlationId,
      processedCount: 0,
      failureCount: 1,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        mode: "read-only-aggregate-quality",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);

    return NextResponse.json(
      {
        success: false,
        auditPersisted,
        correlationId,
        mode: "read-only-aggregate-quality",
        writesPerformed: 0,
        message: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      { status: 500 },
    );
  }
}
