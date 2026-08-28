import { AuditEntry, ValidationError } from "@atlas/kernel";
import { NextRequest, NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import { rolesForAtlasCapability } from "@/features/auth/atlas-capabilities";
import {
  listSafeCorrectionTreatmentQueue,
  type CorrectionTreatmentStatus,
} from "@/features/individuals/individual-data-correction-treatment";

export const dynamic = "force-dynamic";

function parseStatus(value: string | null): CorrectionTreatmentStatus | "all" {
  if (!value || value === "all") return "all";
  if (
    value === "open" ||
    value === "in_progress" ||
    value === "completed" ||
    value === "cancelled"
  )
    return value;
  throw new ValidationError("O status informado é inválido.");
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeAtlas(
    rolesForAtlasCapability("consult"),
  );
  if (!authorization.authorized) return authorization.response;

  const { session } = authorization;
  const correlationId = crypto.randomUUID();

  try {
    const status = parseStatus(request.nextUrl.searchParams.get("status"));
    const items = await listSafeCorrectionTreatmentQueue(status);
    const audit = AuditEntry.create({
      action: "individuals.data-quality.correction-treatment.list",
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: items.length,
      successCount: items.length,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        status,
        mode: "safe-correction-treatment-list",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);

    return NextResponse.json(
      {
        success: true,
        auditPersisted,
        correlationId,
        mode: "safe-correction-treatment-list",
        sourceWritesPerformed: 0,
        count: items.length,
        items,
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    const audit = AuditEntry.create({
      action: "individuals.data-quality.correction-treatment.list",
      outcome: "failure",
      occurredAt: new Date(),
      correlationId,
      failureCount: 1,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        mode: "safe-correction-treatment-list",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);

    return NextResponse.json(
      {
        success: false,
        auditPersisted,
        correlationId,
        sourceWritesPerformed: 0,
        items: [],
        message: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      { status: error instanceof ValidationError ? 400 : 500 },
    );
  }
}
