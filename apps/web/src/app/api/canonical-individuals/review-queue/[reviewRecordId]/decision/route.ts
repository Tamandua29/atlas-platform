import {
  AuditEntry,
  ConflictError,
  NotFoundError,
  ValidationError,
  type FinalDuplicateReviewDecision,
} from "@atlas/kernel";
import { NextRequest, NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import { decidePersistedDuplicateReview } from "@/features/individuals/duplicate-review-queue";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ reviewRecordId: string }> };
type DecisionPayload = {
  decision?: FinalDuplicateReviewDecision;
  justification?: string;
};

function isFinalDecision(value: unknown): value is FinalDuplicateReviewDecision {
  return value === "same-person" || value === "different-people" || value === "inconclusive";
}

function errorStatus(error: unknown): number {
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ConflictError) return 409;
  if (error instanceof ValidationError) return 400;
  return 500;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const authorization = await authorizeAtlas(["reviewer"]);
  if (!authorization.authorized) return authorization.response;
  const { session } = authorization;
  const { reviewRecordId } = await context.params;
  const correlationId = crypto.randomUUID();
  let requestedDecision: FinalDuplicateReviewDecision | undefined;

  try {
    const payload = (await request.json()) as DecisionPayload;
    if (!isFinalDecision(payload.decision)) {
      throw new ValidationError("A decisão informada é inválida.");
    }
    if (typeof payload.justification !== "string") {
      throw new ValidationError("A justificativa é obrigatória.");
    }
    requestedDecision = payload.decision;
    const result = await decidePersistedDuplicateReview({
      recordId: reviewRecordId,
      decision: payload.decision,
      justification: payload.justification,
      reviewerId: session.actorId,
      correlationId,
      decidedAt: new Date(),
    });
    const audit = AuditEntry.create({
      action: "individuals.duplicate-review.decide",
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: 1,
      successCount: 1,
      metadata: {
        reviewRecordId,
        decision: payload.decision,
        actorId: session.actorId,
        actorRole: session.role,
        previousValue: result.alreadyDecided ? payload.decision : "pending",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);
    return NextResponse.json({
      success: true,
      auditPersisted,
      correlationId,
      mode: "session-protected-human-decision",
      reviewRecordId,
      decision: result.decision,
      writesPerformed: result.updated ? 1 : 0,
      alreadyDecided: result.alreadyDecided,
      automaticMergesPerformed: 0,
    });
  } catch (error) {
    console.error("Falha ao registrar decisão humana:", error);
    const audit = AuditEntry.create({
      action: "individuals.duplicate-review.decide",
      outcome: "failure",
      occurredAt: new Date(),
      correlationId,
      processedCount: 1,
      failureCount: 1,
      metadata: {
        reviewRecordId,
        decision: requestedDecision ?? "invalid",
        actorId: session.actorId,
        actorRole: session.role,
        previousValue: "not-verified",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);
    return NextResponse.json(
      {
        success: false,
        auditPersisted,
        correlationId,
        mode: "session-protected-human-decision",
        writesPerformed: 0,
        automaticMergesPerformed: 0,
        message: error instanceof Error ? error.message : "Erro desconhecido ao registrar a decisão.",
      },
      { status: errorStatus(error) },
    );
  }
}
