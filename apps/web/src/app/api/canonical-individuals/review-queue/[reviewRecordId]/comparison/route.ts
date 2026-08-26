import { AuditEntry, NotFoundError } from "@atlas/kernel";
import { NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import { getProtectedDuplicateReviewComparison } from "@/features/individuals/duplicate-review-comparison";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ reviewRecordId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authorization = await authorizeAtlas(["reviewer", "auditor"]);
  if (!authorization.authorized) return authorization.response;
  const { session } = authorization;
  const { reviewRecordId } = await context.params;
  const correlationId = crypto.randomUUID();

  try {
    const comparison =
      await getProtectedDuplicateReviewComparison(reviewRecordId);
    const audit = AuditEntry.create({
      action: "individuals.duplicate-review.compare",
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: comparison.records.length,
      successCount: comparison.records.length,
      metadata: {
        reviewRecordId,
        actorId: session.actorId,
        actorRole: session.role,
        mode: "protected-comparison",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);
    return NextResponse.json(
      {
        success: true,
        auditPersisted,
        correlationId,
        mode: "session-protected-field-comparison",
        automaticMergesPerformed: 0,
        comparison,
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Falha ao abrir comparação protegida:", error);
    const audit = AuditEntry.create({
      action: "individuals.duplicate-review.compare",
      outcome: "failure",
      occurredAt: new Date(),
      correlationId,
      processedCount: 0,
      failureCount: 1,
      metadata: {
        reviewRecordId,
        actorId: session.actorId,
        actorRole: session.role,
        mode: "protected-comparison",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);
    return NextResponse.json(
      {
        success: false,
        auditPersisted,
        correlationId,
        mode: "session-protected-field-comparison",
        automaticMergesPerformed: 0,
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao abrir a comparação.",
      },
      {
        status: error instanceof NotFoundError ? 404 : 500,
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      },
    );
  }
}
