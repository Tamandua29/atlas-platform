import { ValidationError } from "../errors/application-error";
import { UniqueEntityId } from "../identifiers/unique-entity-id";

export type DuplicateReviewStrategy =
  | "cpf"
  | "biographic";

export type DuplicateReviewConfidence =
  | "high"
  | "medium";

export type DuplicateReviewDecision =
  "pending";

export type DuplicateReviewItemInput = {
  readonly sourceRecordIds:
    readonly string[];
  readonly strategy:
    DuplicateReviewStrategy;
  readonly confidence:
    DuplicateReviewConfidence;
  readonly reason: string;
  readonly correlationId: string;
  readonly openedAt: Date;
};

function normalizeSourceRecordIds(
  values: readonly string[],
): string[] {
  return [
    ...new Set(
      values
        .map((value) =>
          value.trim(),
        )
        .filter(Boolean),
    ),
  ].sort();
}

export class DuplicateReviewItem {
  readonly id: UniqueEntityId;
  readonly idempotencyKey: string;
  readonly sourceRecordIds:
    readonly string[];
  readonly strategy:
    DuplicateReviewStrategy;
  readonly confidence:
    DuplicateReviewConfidence;
  readonly reason: string;
  readonly correlationId: string;
  readonly openedAt: Date;
  readonly decision:
    DuplicateReviewDecision;
  readonly status: "open";

  private constructor(
    input: DuplicateReviewItemInput,
    sourceRecordIds:
      readonly string[],
  ) {
    this.id = UniqueEntityId.create();
    this.sourceRecordIds =
      sourceRecordIds;
    this.idempotencyKey =
      `duplicate-review:${sourceRecordIds.join(":")}`;
    this.strategy = input.strategy;
    this.confidence =
      input.confidence;
    this.reason =
      input.reason.trim();
    this.correlationId =
      input.correlationId.trim();
    this.openedAt =
      new Date(input.openedAt);
    this.decision = "pending";
    this.status = "open";
  }

  static create(
    input: DuplicateReviewItemInput,
  ): DuplicateReviewItem {
    const sourceRecordIds =
      normalizeSourceRecordIds(
        input.sourceRecordIds,
      );

    if (sourceRecordIds.length < 2) {
      throw new ValidationError(
        "Uma revisão de duplicidade exige ao menos dois registros de origem distintos.",
      );
    }

    if (!input.reason.trim()) {
      throw new ValidationError(
        "O motivo da revisão é obrigatório.",
      );
    }

    if (!input.correlationId.trim()) {
      throw new ValidationError(
        "O identificador de correlação é obrigatório.",
      );
    }

    if (
      Number.isNaN(
        input.openedAt.getTime(),
      )
    ) {
      throw new ValidationError(
        "A data de abertura da revisão é inválida.",
      );
    }

    return new DuplicateReviewItem(
      input,
      sourceRecordIds,
    );
  }
}
