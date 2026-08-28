import { AuditEntry, ValidationError } from "@atlas/kernel";
import { NextRequest, NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import { rolesForAtlasCapability } from "@/features/auth/atlas-capabilities";
import {
  listSafeIndividualQualityQueue,
  type QualityPriority,
} from "@/features/individuals/individual-data-quality-queue";

export const dynamic = "force-dynamic";

function parsePriority(value: string | null): QualityPriority | "all" {
  if (!value || value === "all") return "all";
  if (value === "critical" || value === "high" || value === "medium")
    return value;
  throw new ValidationError(
    "A prioridade deve ser critical, high, medium ou all.",
  );
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeAtlas(
    rolesForAtlasCapability("consult"),
  );
  if (!authorization.authorized) return authorization.response;

  const { session } = authorization;
  const correlationId = crypto.randomUUID();

  try {
    const priority = parsePriority(
      request.nextUrl.searchParams.get("priority"),
    );
    const allItems = await listSafeIndividualQualityQueue();
    const items =
      priority === "all"
        ? allItems
        : allItems.filter((item) => item.priority === priority);

    const audit = AuditEntry.create({
      action: "individuals.data-quality.queue.list",
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: items.length,
      successCount: items.length,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        priority,
        mode: "safe-read-only-quality-queue",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);

    return NextResponse.json(
      {
        success: true,
        auditPersisted,
        correlationId,
        mode: "safe-read-only-quality-queue",
        writesPerformed: 0,
        priority,
        count: items.length,
        items,
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    const audit = AuditEntry.create({
      action: "individuals.data-quality.queue.list",
      outcome: "failure",
      occurredAt: new Date(),
      correlationId,
      processedCount: 0,
      failureCount: 1,
      metadata: {
        actorId: session.actorId,
        actorRole: session.role,
        mode: "safe-read-only-quality-queue",
      },
    });
    const auditPersisted = await persistAuditSafely(audit);

    return NextResponse.json(
      {
        success: false,
        auditPersisted,
        correlationId,
        writesPerformed: 0,
        items: [],
        message: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      { status: error instanceof ValidationError ? 400 : 500 },
    );
  }
}
