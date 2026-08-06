import {
  AuditEntry,
  ConflictError,
  NotFoundError,
  ValidationError,
  type FinalDuplicateReviewDecision,
} from "@atlas/kernel";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { persistAuditSafely } from "@/features/audit/airtable-audit-repository";
import { decidePersistedDuplicateReview } from "@/features/individuals/duplicate-review-queue";

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params: Promise<{
    reviewRecordId: string;
  }>;
};

type DecisionPayload = {
  decision?:
    FinalDuplicateReviewDecision;
  justification?: string;
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

function isFinalDecision(
  value: unknown,
): value is FinalDuplicateReviewDecision {
  return (
    value === "same-person" ||
    value ===
      "different-people" ||
    value === "inconclusive"
  );
}

function errorStatus(
  error: unknown,
): number {
  if (
    error instanceof
    NotFoundError
  ) {
    return 404;
  }

  if (
    error instanceof
    ConflictError
  ) {
    return 409;
  }

  if (
    error instanceof
    ValidationError
  ) {
    return 400;
  }

  return 500;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  const unauthorized =
    authorize(request);

  if (unauthorized) {
    return unauthorized;
  }

  const reviewerId =
    process.env
      .ATLAS_REVIEWER_ID
      ?.trim();

  if (!reviewerId) {
    return NextResponse.json(
      {
        success: false,
        message:
          "O identificador técnico do revisor não foi configurado.",
      },
      {
        status: 503,
      },
    );
  }

  const {
    reviewRecordId,
  } = await context.params;

  const correlationId =
    crypto.randomUUID();

  let requestedDecision:
    FinalDuplicateReviewDecision
    | undefined;

  try {
    const payload =
      (await request.json()) as
        DecisionPayload;

    if (
      !isFinalDecision(
        payload.decision,
      )
    ) {
      throw new ValidationError(
        "A decisão informada é inválida.",
      );
    }

    if (
      typeof payload.justification !==
      "string"
    ) {
      throw new ValidationError(
        "A justificativa é obrigatória.",
      );
    }

    requestedDecision =
      payload.decision;

    const result =
      await decidePersistedDuplicateReview({
        recordId:
          reviewRecordId,
        decision:
          payload.decision,
        justification:
          payload.justification,
        reviewerId,
        correlationId,
        decidedAt: new Date(),
      });

    const audit = AuditEntry.create({
      action:
        "individuals.duplicate-review.decide",
      outcome: "success",
      occurredAt: new Date(),
      correlationId,
      processedCount: 1,
      successCount: 1,
      metadata: {
        reviewRecordId,
        decision:
          payload.decision,
        actorId: reviewerId,
        previousValue:
          result.alreadyDecided
            ? payload.decision
            : "pending",
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
        "protected-human-decision",
      reviewRecordId,
      decision:
        result.decision,
      writesPerformed:
        result.updated ? 1 : 0,
      alreadyDecided:
        result.alreadyDecided,
      automaticMergesPerformed: 0,
    });
  } catch (error) {
    console.error(
      "Falha ao registrar decisão humana:",
      error,
    );

    const audit = AuditEntry.create({
      action:
        "individuals.duplicate-review.decide",
      outcome: "failure",
      occurredAt: new Date(),
      correlationId,
      processedCount: 1,
      failureCount: 1,
      metadata: {
        reviewRecordId,
        decision:
          requestedDecision ??
          "invalid",
        actorId: reviewerId,
        previousValue:
          "not-verified",
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
          "protected-human-decision",
        writesPerformed: 0,
        automaticMergesPerformed: 0,
        message:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao registrar a decisão.",
      },
      {
        status:
          errorStatus(error),
      },
    );
  }
}
