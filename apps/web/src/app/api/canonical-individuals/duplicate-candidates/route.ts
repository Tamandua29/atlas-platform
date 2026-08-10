import { AuditEntry } from "@atlas/kernel";

import { NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { previewDuplicateCandidatesFromAirtable } from "@/features/individuals/duplicate-candidates-preview";

export const dynamic =
  "force-dynamic";

export async function GET() {
  try {
    const candidates =
      await previewDuplicateCandidatesFromAirtable();

    const audit = AuditEntry.create({
      action: "individuals.duplicate-candidates.preview",
      outcome: "success",
      occurredAt: new Date(),
      processedCount: candidates.length,
      successCount: candidates.length,
      metadata: {
        mode: "read-only",
      },
    });

    const auditPersisted =
      await persistAuditSafely(
        audit,
      );

    return NextResponse.json({
      success: true,
      auditPersisted,
      correlationId:
        audit.correlationId,
      mode:
        "read-only-human-review",
      count: candidates.length,
      candidates,
      generatedAt:
        new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "Falha ao analisar candidatos a duplicidade:",
      error,
    );

    const audit = AuditEntry.create({
      action: "individuals.duplicate-candidates.preview",
      outcome: "failure",
      occurredAt: new Date(),
      processedCount: 0,
      failureCount: 1,
      metadata: {
        mode: "read-only",
      },
    });

    const auditPersisted =
      await persistAuditSafely(
        audit,
      );

    return NextResponse.json(
      {
        success: false,
        auditPersisted,
        correlationId:
          audit.correlationId,
        mode:
          "read-only-human-review",
        count: 0,
        candidates: [],
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido na análise de duplicidades.",
      },
      {
        status: 500,
      },
    );
  }
}
