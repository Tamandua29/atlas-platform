import { AuditEntry } from "@atlas/kernel";
import { NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import { rolesForAtlasCapability } from "@/features/auth/atlas-capabilities";
import { getOperationalReconciliation } from "@/features/individuals/operational-reconciliation";

export const dynamic = "force-dynamic";

export async function GET() {
  const authorization = await authorizeAtlas(
    rolesForAtlasCapability("reconcile"),
  );
  if (!authorization.authorized) return authorization.response;

  const { session } = authorization;
  const correlationId = crypto.randomUUID();

  try {
    const reconciliation = await getOperationalReconciliation();
    const audit = AuditEntry.create({
      action: "individuals.operational-reconciliation.view",
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: reconciliation.totalManaged,
      successCount: reconciliation.healthyCompleted,
      failureCount: reconciliation.attentionRequired,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        mode: "read-only-operational-reconciliation",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);

    return NextResponse.json(
      {
        success: true,
        auditPersisted,
        correlationId,
        mode: "read-only-operational-reconciliation",
        writesPerformed: 0,
        reconciliation,
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("Falha na reconciliação operacional:", error);
    const audit = AuditEntry.create({
      action: "individuals.operational-reconciliation.view",
      outcome: "failure",
      occurredAt: new Date(),
      correlationId,
      processedCount: 0,
      failureCount: 1,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        mode: "read-only-operational-reconciliation",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);

    return NextResponse.json(
      {
        success: false,
        auditPersisted,
        correlationId,
        mode: "read-only-operational-reconciliation",
        writesPerformed: 0,
        message: "Não foi possível consolidar o estado operacional.",
      },
      { status: 500 },
    );
  }
}
