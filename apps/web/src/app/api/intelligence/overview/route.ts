import { AuditEntry } from "@atlas/kernel";
import { NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import { listIndividualDirectory } from "@/features/intelligence/individual-directory";
import { buildIntelligenceOverview } from "@/features/intelligence/intelligence-overview";
import { listOperationalWarrants } from "@/features/intelligence/individual-warrants";
import { listOrganizationDirectory } from "@/features/intelligence/organization-directory";
import { listVehicleDirectory } from "@/features/intelligence/vehicle-directory";

export const dynamic = "force-dynamic";

export async function GET() {
  const authorization = await authorizeAtlas(["reviewer", "auditor"]);
  if (!authorization.authorized) return authorization.response;

  const correlationId = crypto.randomUUID();

  try {
    const [individuals, organizations, vehicles, warrants] = await Promise.all([
      listIndividualDirectory(100),
      listOrganizationDirectory(200),
      listVehicleDirectory(200),
      listOperationalWarrants(200),
    ]);
    const overview = buildIntelligenceOverview({ individuals, organizations, vehicles, warrants });
    const auditPersisted = await persistAuditSafely(AuditEntry.create({
      action: "intelligence.overview.read",
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: overview.totals.all,
      successCount: overview.totals.all,
      metadata: {
        actorId: authorization.session.actorId,
        actorRole: authorization.session.role,
        mode: "protected-intelligence-overview",
      },
    }));

    return NextResponse.json(
      { success: true, auditPersisted, correlationId, mode: "aggregate-only", overview },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, correlationId, message: error instanceof Error ? error.message : "Erro desconhecido." },
      { status: 500 },
    );
  }
}
