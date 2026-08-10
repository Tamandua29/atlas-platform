import { AuditEntry } from "@atlas/kernel";
import { NextRequest, NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import { listOrganizationDirectory } from "@/features/intelligence/organization-directory";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await authorizeAtlas(["reviewer", "auditor"]);
  if (!authorization.authorized) return authorization.response;

  const correlationId = crypto.randomUUID();
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") || 100);
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 100;

  try {
    const organizations = await listOrganizationDirectory(limit);
    const auditPersisted = await persistAuditSafely(AuditEntry.create({
      action: "intelligence.organizations.list",
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: organizations.length,
      successCount: organizations.length,
      metadata: {
        actorId: authorization.session.actorId,
        actorRole: authorization.session.role,
        mode: "protected-organization-directory",
      },
    }));

    return NextResponse.json(
      { success: true, auditPersisted, correlationId, count: organizations.length, organizations },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, correlationId, message: error instanceof Error ? error.message : "Erro desconhecido." },
      { status: 500 },
    );
  }
}
