import { AuditEntry, ValidationError } from "@atlas/kernel";
import { NextRequest, NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import { requestIndividualDataCorrection } from "@/features/individuals/individual-data-correction-request";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ queueId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const authorization = await authorizeAtlas(["reviewer"]);
  if (!authorization.authorized) return authorization.response;

  const { session } = authorization;
  const { queueId } = await context.params;
  const correlationId = crypto.randomUUID();

  try {
    const payload = (await request.json()) as { justification?: unknown };
    if (
      typeof payload.justification !== "string" ||
      payload.justification.trim().length < 10 ||
      payload.justification.trim().length > 500
    ) {
      throw new ValidationError(
        "A justificativa deve possuir entre 10 e 500 caracteres.",
      );
    }

    const result = await requestIndividualDataCorrection({
      queueId,
      justification: payload.justification,
      requesterId: session.actorId,
      requestedAt: new Date(),
    });

    const audit = AuditEntry.create({
      action: "individuals.data-quality.correction.request",
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: 1,
      successCount: 1,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        queueId,
        reviewId: result.reviewId,
        created: String(result.created),
        mode: "human-request-no-source-write",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);

    return NextResponse.json({
      success: true,
      auditPersisted,
      correlationId,
      mode: "human-request-no-source-write",
      reviewId: result.reviewId,
      requestCreated: result.created,
      sourceWritesPerformed: 0,
    });
  } catch (error) {
    const audit = AuditEntry.create({
      action: "individuals.data-quality.correction.request",
      outcome: "failure",
      occurredAt: new Date(),
      correlationId,
      processedCount: 1,
      failureCount: 1,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        queueId,
        mode: "human-request-no-source-write",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);

    return NextResponse.json(
      {
        success: false,
        auditPersisted,
        correlationId,
        sourceWritesPerformed: 0,
        message: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      { status: error instanceof ValidationError ? 400 : 500 },
    );
  }
}
