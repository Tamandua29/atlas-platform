import { AuditEntry, NotFoundError } from "@atlas/kernel";
import { NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import { rolesForAtlasCapability } from "@/features/auth/atlas-capabilities";
import { getProtectedIndividualQualityDetail } from "@/features/individuals/individual-data-quality-queue";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ queueId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const authorization = await authorizeAtlas(
    rolesForAtlasCapability("consult"),
  );
  if (!authorization.authorized) return authorization.response;

  const { session } = authorization;
  const { queueId } = await context.params;
  const correlationId = crypto.randomUUID();

  try {
    const detail = await getProtectedIndividualQualityDetail(queueId);
    if (!detail) throw new NotFoundError("Item de saneamento não encontrado.");

    const audit = AuditEntry.create({
      action: "individuals.data-quality.queue.detail",
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: 1,
      successCount: 1,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        queueId,
        mode: "protected-read-only-quality-detail",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);

    return NextResponse.json(
      {
        success: true,
        auditPersisted,
        correlationId,
        mode: "protected-read-only-quality-detail",
        writesPerformed: 0,
        detail,
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    const audit = AuditEntry.create({
      action: "individuals.data-quality.queue.detail",
      outcome: "failure",
      occurredAt: new Date(),
      correlationId,
      processedCount: 0,
      failureCount: 1,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        queueId,
        mode: "protected-read-only-quality-detail",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);

    return NextResponse.json(
      {
        success: false,
        auditPersisted,
        correlationId,
        writesPerformed: 0,
        message: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      { status: error instanceof NotFoundError ? 404 : 500 },
    );
  }
}
