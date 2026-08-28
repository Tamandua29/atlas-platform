import { AuditEntry, ValidationError } from "@atlas/kernel";
import { NextRequest, NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import { rolesForAtlasCapability } from "@/features/auth/atlas-capabilities";
import { decideCorrectionProposal } from "@/features/individuals/individual-data-correction-proposal";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ reviewId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const authorization = await authorizeAtlas(rolesForAtlasCapability("decide"));
  if (!authorization.authorized) return authorization.response;

  const { session } = authorization;
  const { reviewId } = await context.params;
  const correlationId = crypto.randomUUID();

  try {
    const payload = (await request.json()) as {
      decision?: unknown;
      reason?: unknown;
    };
    if (payload.decision !== "approve" && payload.decision !== "reject") {
      throw new ValidationError("A decisão deve ser approve ou reject.");
    }
    if (typeof payload.reason !== "string") {
      throw new ValidationError("A justificativa da decisão deve ser textual.");
    }

    const proposal = await decideCorrectionProposal({
      reviewId,
      decision: payload.decision,
      reason: payload.reason,
      approverId: session.actorId,
      decidedAt: new Date(),
    });
    const audit = AuditEntry.create({
      action: `individuals.data-quality.correction-proposal.${payload.decision}`,
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: 1,
      successCount: 1,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        reviewId,
        proposerId: proposal.proposerId ?? "unknown",
        resultingStatus: proposal.proposalStatus ?? "unknown",
        sourceWritesPerformed: "0",
        mode: "segregated-human-decision-no-source-write",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);

    return NextResponse.json({
      success: true,
      auditPersisted,
      correlationId,
      mode: "segregated-human-decision-no-source-write",
      sourceWritesPerformed: 0,
      proposal,
    });
  } catch (error) {
    const audit = AuditEntry.create({
      action: "individuals.data-quality.correction-proposal.decision",
      outcome: "failure",
      occurredAt: new Date(),
      correlationId,
      processedCount: 1,
      failureCount: 1,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        reviewId,
        sourceWritesPerformed: "0",
        mode: "segregated-human-decision-no-source-write",
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
