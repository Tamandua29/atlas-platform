import { AuditEntry } from "@atlas/kernel";
import { NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { authorizeAtlas } from "@/features/auth/authorize-atlas";
import { getIndividualDirectoryEntry } from "@/features/intelligence/individual-directory";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ recordId: string }> },
) {
  const authorization = await authorizeAtlas(["reviewer", "auditor"]);
  if (!authorization.authorized) return authorization.response;

  const { recordId } = await context.params;
  const correlationId = crypto.randomUUID();

  try {
    const individual = await getIndividualDirectoryEntry(recordId);
    if (!individual) {
      return NextResponse.json(
        { success: false, correlationId, message: "Indivíduo não encontrado." },
        { status: 404 },
      );
    }

    const auditPersisted = await persistAuditSafely(AuditEntry.create({
      action: "intelligence.individuals.profile",
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: 1,
      successCount: 1,
      metadata: {
        actorId: authorization.session.actorId,
        actorRole: authorization.session.role,
        recordId,
        mode: "protected-individual-profile",
      },
    }));

    return NextResponse.json(
      { success: true, auditPersisted, correlationId, individual },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, correlationId, message: error instanceof Error ? error.message : "Erro desconhecido." },
      { status: 500 },
    );
  }
}
