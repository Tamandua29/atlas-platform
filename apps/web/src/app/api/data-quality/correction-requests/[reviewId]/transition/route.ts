import { AuditEntry, ValidationError } from "@atlas/kernel";
import { NextRequest, NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import { rolesForAtlasCapability } from "@/features/auth/atlas-capabilities";
import { transitionCorrectionTreatment } from "@/features/individuals/individual-data-correction-treatment";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ reviewId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const authorization = await authorizeAtlas(
    rolesForAtlasCapability("transition"),
  );
  if (!authorization.authorized) return authorization.response;

  const { session } = authorization;
  const { reviewId } = await context.params;
  const correlationId = crypto.randomUUID();

  try {
    const payload = (await request.json()) as {
      action?: unknown;
      note?: unknown;
    };
    if (payload.action !== "claim" && payload.action !== "complete") {
      throw new ValidationError("A ação deve ser claim ou complete.");
    }
    if (payload.note !== undefined && typeof payload.note !== "string") {
      throw new ValidationError("A nota de tratamento deve ser textual.");
    }

    const item = await transitionCorrectionTreatment({
      reviewId,
      action: payload.action,
      note: payload.note as string | undefined,
      actorId: session.actorId,
      actorIsAdministrator: session.role === "administrator",
      occurredAt: new Date(),
    });

    const audit = AuditEntry.create({
      action: `individuals.data-quality.correction-treatment.${payload.action}`,
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: 1,
      successCount: 1,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        reviewId,
        resultingStatus: item.status,
        mode: "human-workflow-no-source-write",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);

    return NextResponse.json({
      success: true,
      auditPersisted,
      correlationId,
      mode: "human-workflow-no-source-write",
      sourceWritesPerformed: 0,
      item,
    });
  } catch (error) {
    const audit = AuditEntry.create({
      action: "individuals.data-quality.correction-treatment.transition",
      outcome: "failure",
      occurredAt: new Date(),
      correlationId,
      processedCount: 1,
      failureCount: 1,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        reviewId,
        mode: "human-workflow-no-source-write",
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
      { status: error instanceof ValidationError ? 400 : 409 },
    );
  }
}
