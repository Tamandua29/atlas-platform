import { AuditEntry, ValidationError } from "@atlas/kernel";
import { NextRequest, NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import { executeApprovedCorrection } from "@/features/individuals/individual-data-correction-execution";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ reviewId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const authorization = await authorizeAtlas(["reviewer"]);
  if (!authorization.authorized) return authorization.response;

  const { session } = authorization;
  const { reviewId } = await context.params;
  const correlationId = crypto.randomUUID();

  try {
    const payload = (await request.json()) as {
      confirmation?: unknown;
      note?: unknown;
    };
    if (typeof payload.confirmation !== "string" || typeof payload.note !== "string") {
      throw new ValidationError("A confirmação e a nota operacional devem ser textuais.");
    }

    const result = await executeApprovedCorrection({
      reviewId,
      executorId: session.actorId,
      confirmation: payload.confirmation,
      note: payload.note,
      executedAt: new Date(),
    });
    const audit = AuditEntry.create({
      action: "individuals.data-quality.correction.execute",
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: 1,
      successCount: 1,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        reviewId,
        executionStatus: result.executionStatus,
        sourceWritesPerformed: String(result.sourceWritesPerformed),
        reconciled: String(result.reconciled),
        mode: "three-person-controlled-source-write",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);

    return NextResponse.json({
      success: true,
      auditPersisted,
      correlationId,
      mode: "three-person-controlled-source-write",
      ...result,
    });
  } catch (error) {
    const audit = AuditEntry.create({
      action: "individuals.data-quality.correction.execute",
      outcome: "failure",
      occurredAt: new Date(),
      correlationId,
      processedCount: 1,
      failureCount: 1,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        reviewId,
        sourceWriteState: "none-or-reconciliation-required",
        mode: "three-person-controlled-source-write",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);

    return NextResponse.json(
      {
        success: false,
        auditPersisted,
        correlationId,
        sourceWritesPerformed: null,
        requiresReconciliation: true,
        message: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      { status: error instanceof ValidationError ? 400 : 409 },
    );
  }
}
