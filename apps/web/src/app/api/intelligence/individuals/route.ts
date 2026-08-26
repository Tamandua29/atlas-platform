import { AuditEntry } from "@atlas/kernel";
import { NextRequest, NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import { listIndividualDirectory } from "@/features/intelligence/individual-directory";
import {
  classifyDirectoryPriority,
  type JudicialAttention,
} from "@/features/intelligence/individual-directory-filter";
import { summarizeWarrantsByIndividual } from "@/features/intelligence/individual-warrants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await authorizeAtlas(["reviewer", "auditor"]);
  if (!authorization.authorized) return authorization.response;

  const correlationId = crypto.randomUUID();
  const requestedLimit = Number(
    request.nextUrl.searchParams.get("limit") || 100,
  );
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 100;

  try {
    const directory = await listIndividualDirectory(limit);
    const warrantSummaries = await summarizeWarrantsByIndividual(
      directory.map((individual) => individual.recordId),
    );
    const individuals = directory.map((individual) => {
      const summary = warrantSummaries[individual.recordId];
      let judicialAttention: JudicialAttention = "none";
      if (summary?.activeCount) judicialAttention = "active";
      else if (summary?.expiringCount) judicialAttention = "expiring";
      else if (summary?.needsVerificationCount) judicialAttention = "verify";

      return {
        ...individual,
        linkedWarrantCount: summary?.linkedCount || 0,
        activeWarrantCount: summary?.activeCount || 0,
        expiringWarrantCount: summary?.expiringCount || 0,
        judicialAttention,
        operationalPriority: classifyDirectoryPriority(judicialAttention),
      };
    });
    const auditPersisted = await persistAuditSafely(
      AuditEntry.create({
        action: "intelligence.individuals.list",
        outcome: "success",
        occurredAt: new Date(),
        correlationId,
        processedCount: individuals.length,
        successCount: individuals.length,
        metadata: {
          actorId: authorization.session.actorId,
          actorRole: authorization.session.role,
          mode: "protected-individual-directory",
        },
      }),
    );

    return NextResponse.json(
      {
        success: true,
        auditPersisted,
        correlationId,
        count: individuals.length,
        individuals,
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        correlationId,
        message: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      { status: 500 },
    );
  }
}
