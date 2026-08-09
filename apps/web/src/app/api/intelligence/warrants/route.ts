import { AuditEntry } from "@atlas/kernel";
import { NextRequest, NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import { listOperationalWarrants } from "@/features/intelligence/individual-warrants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await authorizeAtlas(["reviewer", "auditor"]);
  if (!authorization.authorized) return authorization.response;
  const correlationId = crypto.randomUUID();
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") || 100);

  try {
    const warrants = await listOperationalWarrants(requestedLimit);
    const auditPersisted = await persistAuditSafely(AuditEntry.create({
      action: "intelligence.warrants.list",
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: warrants.length,
      successCount: warrants.length,
      metadata: {
        actorId: authorization.session.actorId,
        actorRole: authorization.session.role,
        mode: "protected-warrant-monitor",
      },
    }));

    return NextResponse.json(
      { success: true, auditPersisted, correlationId, count: warrants.length, warrants },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, correlationId, message: error instanceof Error ? error.message : "Erro desconhecido." },
      { status: 500, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  }
}
