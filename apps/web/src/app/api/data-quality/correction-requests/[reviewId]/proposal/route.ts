import { AuditEntry, ValidationError } from "@atlas/kernel";
import { NextRequest, NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import {
  getProtectedCorrectionProposalContext,
  saveCorrectionProposal,
} from "@/features/individuals/individual-data-correction-proposal";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ reviewId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const authorization = await authorizeAtlas(["reviewer", "auditor"]);
  if (!authorization.authorized) return authorization.response;

  const { session } = authorization;
  const { reviewId } = await context.params;
  const correlationId = crypto.randomUUID();

  try {
    const proposal = await getProtectedCorrectionProposalContext(reviewId);
    const audit = AuditEntry.create({
      action: "individuals.data-quality.correction-proposal.read",
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: 1,
      successCount: 1,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        reviewId,
        mode: "protected-proposal-read-no-source-write",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);

    return NextResponse.json(
      {
        success: true,
        auditPersisted,
        correlationId,
        mode: "protected-proposal-read-no-source-write",
        sourceWritesPerformed: 0,
        proposal,
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        correlationId,
        sourceWritesPerformed: 0,
        message: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      { status: 404 },
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const authorization = await authorizeAtlas(["reviewer"]);
  if (!authorization.authorized) return authorization.response;

  const { session } = authorization;
  const { reviewId } = await context.params;
  const correlationId = crypto.randomUUID();

  try {
    const payload = (await request.json()) as { values?: unknown };
    if (!payload.values || typeof payload.values !== "object" || Array.isArray(payload.values)) {
      throw new ValidationError("Os valores propostos devem ser informados em objeto estruturado.");
    }

    const proposal = await saveCorrectionProposal({
      reviewId,
      values: payload.values as Record<string, string>,
      proposerId: session.actorId,
      proposedAt: new Date(),
    });
    const audit = AuditEntry.create({
      action: "individuals.data-quality.correction-proposal.create",
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: 1,
      successCount: 1,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        reviewId,
        proposedFields: proposal.allowedFields.join(","),
        proposalStatus: proposal.proposalStatus ?? "unknown",
        mode: "human-proposal-no-source-write",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);

    return NextResponse.json({
      success: true,
      auditPersisted,
      correlationId,
      mode: "human-proposal-no-source-write",
      sourceWritesPerformed: 0,
      proposal,
    });
  } catch (error) {
    const audit = AuditEntry.create({
      action: "individuals.data-quality.correction-proposal.create",
      outcome: "failure",
      occurredAt: new Date(),
      correlationId,
      processedCount: 1,
      failureCount: 1,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        reviewId,
        mode: "human-proposal-no-source-write",
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
