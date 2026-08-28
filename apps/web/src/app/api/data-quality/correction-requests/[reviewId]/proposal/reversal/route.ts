import { AuditEntry, ValidationError } from "@atlas/kernel";
import { NextRequest, NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import { rolesForAtlasCapability } from "@/features/auth/atlas-capabilities";
import {
  decideCorrectionReversal,
  executeCorrectionReversal,
  requestCorrectionReversal,
} from "@/features/individuals/individual-data-correction-reversal";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ reviewId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const authorization = await authorizeAtlas(
    rolesForAtlasCapability("execute"),
  );
  if (!authorization.authorized) return authorization.response;
  const { session } = authorization;
  const { reviewId } = await context.params;
  const correlationId = crypto.randomUUID();
  let action = "unknown";

  try {
    const payload = (await request.json()) as {
      action?: unknown;
      reason?: unknown;
      decision?: unknown;
      confirmation?: unknown;
      note?: unknown;
    };
    if (typeof payload.action !== "string") {
      throw new ValidationError("A ação de reversão é obrigatória.");
    }
    action = payload.action;
    let result;
    if (action === "request") {
      if (typeof payload.reason !== "string") {
        throw new ValidationError("O motivo da reversão deve ser textual.");
      }
      result = await requestCorrectionReversal({
        reviewId,
        requesterId: session.actorId,
        reason: payload.reason,
        requestedAt: new Date(),
      });
    } else if (action === "decide") {
      if (
        (payload.decision !== "approve" && payload.decision !== "reject") ||
        typeof payload.reason !== "string"
      ) {
        throw new ValidationError(
          "A decisão e sua justificativa são obrigatórias.",
        );
      }
      result = await decideCorrectionReversal({
        reviewId,
        approverId: session.actorId,
        decision: payload.decision,
        reason: payload.reason,
        decidedAt: new Date(),
      });
    } else if (action === "execute") {
      if (
        typeof payload.confirmation !== "string" ||
        typeof payload.note !== "string"
      ) {
        throw new ValidationError(
          "A confirmação e a nota da reversão são obrigatórias.",
        );
      }
      result = await executeCorrectionReversal({
        reviewId,
        executorId: session.actorId,
        confirmation: payload.confirmation,
        note: payload.note,
        revertedAt: new Date(),
      });
    } else {
      throw new ValidationError("Ação de reversão inválida.");
    }

    const audit = AuditEntry.create({
      action: `individuals.data-quality.correction.reversal.${action}`,
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: 1,
      successCount: 1,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        reviewId,
        reversalStatus: result.reversalStatus,
        sourceWritesPerformed: String(result.sourceWritesPerformed),
        reconciled: String(result.reconciled),
        mode: "segregated-version-checked-reversal",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);
    return NextResponse.json({
      success: true,
      auditPersisted,
      correlationId,
      mode: "segregated-version-checked-reversal",
      ...result,
    });
  } catch (error) {
    const audit = AuditEntry.create({
      action: `individuals.data-quality.correction.reversal.${action}`,
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
        mode: "segregated-version-checked-reversal",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);
    return NextResponse.json(
      {
        success: false,
        auditPersisted,
        correlationId,
        requiresReconciliation: action === "execute",
        message: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      { status: error instanceof ValidationError ? 400 : 409 },
    );
  }
}
