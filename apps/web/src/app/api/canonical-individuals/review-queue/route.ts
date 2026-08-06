import { AuditEntry, ValidationError } from "@atlas/kernel";
import { NextRequest, NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import {
  listSafeDuplicateReviews,
  type DuplicateReviewListStatus,
} from "@/features/individuals/duplicate-review-list";

export const dynamic = "force-dynamic";

function parseStatus(value: string | null): DuplicateReviewListStatus {
  if (!value) return "open";
  if (value === "open" || value === "completed" || value === "all") return value;
  throw new ValidationError("O filtro status deve ser open, completed ou all.");
}

function parseLimit(value: string | null): number {
  if (!value) return 25;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
    throw new ValidationError("O limite deve ser um inteiro entre 1 e 50.");
  }
  return parsed;
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeAtlas(["reviewer", "auditor"]);
  if (!authorization.authorized) return authorization.response;
  const { session } = authorization;
  const correlationId = crypto.randomUUID();

  try {
    const status = parseStatus(request.nextUrl.searchParams.get("status"));
    const limit = parseLimit(request.nextUrl.searchParams.get("limit"));
    const items = await listSafeDuplicateReviews(status, limit);
    const audit = AuditEntry.create({
      action: "individuals.duplicate-review.list",
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: items.length,
      successCount: items.length,
      metadata: {
        mode: "safe-review-list",
        actorId: session.actorId,
        actorRole: session.role,
      },
    });
    const auditPersisted = await persistAuditSafely(audit);
    return NextResponse.json({
      success: true,
      auditPersisted,
      correlationId,
      mode: "safe-session-protected-review-list",
      status,
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("Falha ao consultar fila de revisões:", error);
    const audit = AuditEntry.create({
      action: "individuals.duplicate-review.list",
      outcome: "failure",
      occurredAt: new Date(),
      correlationId,
      processedCount: 0,
      failureCount: 1,
      metadata: {
        mode: "safe-review-list",
        actorId: session.actorId,
        actorRole: session.role,
      },
    });
    const auditPersisted = await persistAuditSafely(audit);
    return NextResponse.json(
      {
        success: false,
        auditPersisted,
        correlationId,
        mode: "safe-session-protected-review-list",
        count: 0,
        items: [],
        message: error instanceof Error ? error.message : "Erro desconhecido ao consultar a fila.",
      },
      { status: error instanceof ValidationError ? 400 : 500 },
    );
  }
}
