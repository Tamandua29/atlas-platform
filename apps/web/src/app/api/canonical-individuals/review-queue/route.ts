import {
  AuditEntry,
  ValidationError,
} from "@atlas/kernel";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import {
  listSafeDuplicateReviews,
  type DuplicateReviewListStatus,
} from "@/features/individuals/duplicate-review-list";

export const dynamic =
  "force-dynamic";

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

function parseStatus(
  value: string | null,
): DuplicateReviewListStatus {
  if (!value) {
    return "open";
  }

  if (
    value === "open" ||
    value === "completed" ||
    value === "all"
  ) {
    return value;
  }

  throw new ValidationError(
    "O filtro status deve ser open, completed ou all.",
  );
}

function parseLimit(
  value: string | null,
): number {
  if (!value) {
    return 25;
  }

  const parsed =
    Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 1 ||
    parsed > 50
  ) {
    throw new ValidationError(
      "O limite deve ser um inteiro entre 1 e 50.",
    );
  }

  return parsed;
}

export async function GET(
  request: NextRequest,
) {
  const unauthorized =
    authorize(request);

  if (unauthorized) {
    return unauthorized;
  }

  const correlationId =
    crypto.randomUUID();

  try {
    const status =
      parseStatus(
        request.nextUrl.searchParams.get(
          "status",
        ),
      );

    const limit =
      parseLimit(
        request.nextUrl.searchParams.get(
          "limit",
        ),
      );

    const items =
      await listSafeDuplicateReviews(
        status,
        limit,
      );

    const audit = AuditEntry.create({
      action:
        "individuals.duplicate-review.list",
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount:
        items.length,
      successCount:
        items.length,
      metadata: {
        mode:
          "safe-review-list",
        actorId:
          process.env
            .ATLAS_REVIEWER_ID
            ?.trim() ||
          "internal-api",
      },
    });

    const auditPersisted =
      await persistAuditSafely(
        audit,
      );

    return NextResponse.json({
      success: true,
      auditPersisted,
      correlationId,
      mode:
        "safe-protected-review-list",
      status,
      count: items.length,
      items,
    });
  } catch (error) {
    console.error(
      "Falha ao consultar fila de revisões:",
      error,
    );

    const audit = AuditEntry.create({
      action:
        "individuals.duplicate-review.list",
      outcome: "failure",
      occurredAt: new Date(),
      correlationId,
      processedCount: 0,
      failureCount: 1,
      metadata: {
        mode:
          "safe-review-list",
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
          "safe-protected-review-list",
        count: 0,
        items: [],
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao consultar a fila.",
      },
      {
        status:
          error instanceof
          ValidationError
            ? 400
            : 500,
      },
    );
  }
}
