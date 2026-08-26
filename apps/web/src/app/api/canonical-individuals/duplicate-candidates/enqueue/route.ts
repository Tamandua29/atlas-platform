import { AuditEntry } from "@atlas/kernel";

import { NextRequest, NextResponse } from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { previewDuplicateCandidatesFromAirtable } from "@/features/individuals/duplicate-candidates-preview";
import { enqueueDuplicateReviewCandidates } from "@/features/individuals/duplicate-review-queue";

export const dynamic = "force-dynamic";

function authorize(request: NextRequest): NextResponse | null {
  const expectedKey = process.env.ATLAS_INTERNAL_API_KEY?.trim();

  if (!expectedKey) {
    return NextResponse.json(
      {
        success: false,
        message: "A chave interna do Atlas não foi configurada.",
      },
      {
        status: 503,
      },
    );
  }

  const providedKey = request.headers.get("x-atlas-internal-key")?.trim();

  if (providedKey !== expectedKey) {
    return NextResponse.json(
      {
        success: false,
        message: "Acesso não autorizado.",
      },
      {
        status: 401,
      },
    );
  }

  return null;
}

export async function POST(request: NextRequest) {
  const unauthorized = authorize(request);

  if (unauthorized) {
    return unauthorized;
  }

  const correlationId = crypto.randomUUID();

  try {
    const candidates = await previewDuplicateCandidatesFromAirtable();

    const queueResult = await enqueueDuplicateReviewCandidates(
      candidates,
      correlationId,
    );

    const audit = AuditEntry.create({
      action: "individuals.duplicate-review.enqueue",
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: candidates.length,
      successCount: candidates.length,
      metadata: {
        mode: "human-review-queue",
      },
    });

    const auditPersisted = await persistAuditSafely(audit);

    return NextResponse.json({
      success: true,
      auditPersisted,
      correlationId,
      mode: "persistent-human-review-queue",
      candidatesAnalyzed: candidates.length,
      writesPerformed: queueResult.created,
      existingSkipped: queueResult.existingSkipped,
      automaticMergesPerformed: 0,
    });
  } catch (error) {
    console.error("Falha ao alimentar a fila de revisão humana:", error);

    const audit = AuditEntry.create({
      action: "individuals.duplicate-review.enqueue",
      outcome: "failure",
      occurredAt: new Date(),
      correlationId,
      processedCount: 0,
      failureCount: 1,
      metadata: {
        mode: "human-review-queue",
      },
    });

    const auditPersisted = await persistAuditSafely(audit);

    return NextResponse.json(
      {
        success: false,
        auditPersisted,
        correlationId,
        mode: "persistent-human-review-queue",
        writesPerformed: 0,
        automaticMergesPerformed: 0,
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao alimentar a fila de revisão.",
      },
      {
        status: 500,
      },
    );
  }
}
