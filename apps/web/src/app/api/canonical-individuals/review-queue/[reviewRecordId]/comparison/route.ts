import {
  AuditEntry,
  NotFoundError,
} from "@atlas/kernel";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { getProtectedDuplicateReviewComparison } from "@/features/individuals/duplicate-review-comparison";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params: Promise<{
    reviewRecordId: string;
  }>;
};

function authorize(
  request: NextRequest,
): NextResponse | null {
  const expectedKey =
    process.env
      .ATLAS_INTERNAL_API_KEY
      ?.trim();

  if (!expectedKey) {
    return NextResponse.json(
      {
        success: false,
        message:
          "A chave interna do Atlas não foi configurada.",
      },
      {
        status: 503,
      },
    );
  }

  const providedKey =
    request.headers
      .get(
        "x-atlas-internal-key",
      )
      ?.trim();

  if (providedKey !== expectedKey) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Acesso não autorizado.",
      },
      {
        status: 401,
      },
    );
  }

  return null;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const unauthorized =
    authorize(request);

  if (unauthorized) {
    return unauthorized;
  }

  const {
    reviewRecordId,
  } = await context.params;

  const correlationId =
    crypto.randomUUID();

  try {
    const comparison =
      await getProtectedDuplicateReviewComparison(
        reviewRecordId,
      );

    const audit = AuditEntry.create({
      action:
        "individuals.duplicate-review.compare",
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount:
        comparison.records.length,
      successCount:
        comparison.records.length,
      metadata: {
        reviewRecordId,
        actorId:
          process.env
            .ATLAS_REVIEWER_ID
            ?.trim() ||
          "internal-api",
        mode:
          "protected-comparison",
      },
    });

    const auditPersisted =
      await persistAuditSafely(
        audit,
      );

    return NextResponse.json(
      {
        success: true,
        auditPersisted,
        correlationId,
        mode:
          "protected-field-comparison",
        automaticMergesPerformed: 0,
        comparison,
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error(
      "Falha ao abrir comparação protegida:",
      error,
    );

    const audit = AuditEntry.create({
      action:
        "individuals.duplicate-review.compare",
      outcome: "failure",
      occurredAt: new Date(),
      correlationId,
      processedCount: 0,
      failureCount: 1,
      metadata: {
        reviewRecordId,
        actorId:
          process.env
            .ATLAS_REVIEWER_ID
            ?.trim() ||
          "internal-api",
        mode:
          "protected-comparison",
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
        correlationId,
        mode:
          "protected-field-comparison",
        automaticMergesPerformed: 0,
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao abrir a comparação.",
      },
      {
        status:
          error instanceof
          NotFoundError
            ? 404
            : 500,
        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",
        },
      },
    );
  }
}
