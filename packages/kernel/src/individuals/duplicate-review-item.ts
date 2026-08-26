import { ConflictError, ValidationError } from "../errors/application-error";
import { UniqueEntityId } from "../identifiers/unique-entity-id";

export type DuplicateReviewStrategy = "cpf" | "biographic";

export type DuplicateReviewConfidence = "high" | "medium";

export type FinalDuplicateReviewDecision =
  "same-person" | "different-people" | "inconclusive";

export type DuplicateReviewDecision = "pending" | FinalDuplicateReviewDecision;

export type DuplicateReviewItemInput = {
  readonly sourceRecordIds: readonly string[];
  readonly strategy: DuplicateReviewStrategy;
  readonly confidence: DuplicateReviewConfidence;
  readonly reason: string;
  readonly correlationId: string;
  readonly openedAt: Date;
};

export type DecideDuplicateReviewInput = {
  readonly decision: FinalDuplicateReviewDecision;
  readonly justification: string;
  readonly reviewerId: string;
  readonly decidedAt: Date;
};

function normalizeSourceRecordIds(values: readonly string[]): string[] {
  return [
    ...new Set(values.map((value) => value.trim()).filter(Boolean)),
  ].sort();
}

export class DuplicateReviewItem {
  readonly id: UniqueEntityId;
  readonly idempotencyKey: string;
  readonly sourceRecordIds: readonly string[];
  readonly strategy: DuplicateReviewStrategy;
  readonly confidence: DuplicateReviewConfidence;
  readonly reason: string;
  readonly correlationId: string;
  readonly openedAt: Date;

  private _decision: DuplicateReviewDecision = "pending";
  private _status: "open" | "completed" = "open";
  private _justification?: string;
  private _reviewerId?: string;
  private _decidedAt?: Date;

  private constructor(
    input: DuplicateReviewItemInput,
    sourceRecordIds: readonly string[],
  ) {
    this.id = UniqueEntityId.create();
    this.sourceRecordIds = sourceRecordIds;
    this.idempotencyKey = `duplicate-review:${sourceRecordIds.join(":")}`;
    this.strategy = input.strategy;
    this.confidence = input.confidence;
    this.reason = input.reason.trim();
    this.correlationId = input.correlationId.trim();
    this.openedAt = new Date(input.openedAt);
  }

  get decision(): DuplicateReviewDecision {
    return this._decision;
  }

  get status(): "open" | "completed" {
    return this._status;
  }

  get justification(): string | undefined {
    return this._justification;
  }

  get reviewerId(): string | undefined {
    return this._reviewerId;
  }

  get decidedAt(): Date | undefined {
    return this._decidedAt ? new Date(this._decidedAt) : undefined;
  }

  static create(input: DuplicateReviewItemInput): DuplicateReviewItem {
    const sourceRecordIds = normalizeSourceRecordIds(input.sourceRecordIds);

    if (sourceRecordIds.length < 2) {
      throw new ValidationError(
        "Uma revisão de duplicidade exige ao menos dois registros de origem distintos.",
      );
    }

    if (!input.reason.trim()) {
      throw new ValidationError("O motivo da revisão é obrigatório.");
    }

    if (!input.correlationId.trim()) {
      throw new ValidationError("O identificador de correlação é obrigatório.");
    }

    if (Number.isNaN(input.openedAt.getTime())) {
      throw new ValidationError("A data de abertura da revisão é inválida.");
    }

    return new DuplicateReviewItem(input, sourceRecordIds);
  }

  decide(input: DecideDuplicateReviewInput): void {
    if (this._status !== "open") {
      throw new ConflictError("A revisão já possui uma decisão final.");
    }

    const justification = input.justification.trim();
    const reviewerId = input.reviewerId.trim();

    if (justification.length < 10) {
      throw new ValidationError(
        "A justificativa da decisão deve possuir ao menos 10 caracteres.",
      );
    }

    if (!reviewerId) {
      throw new ValidationError(
        "O identificador técnico do revisor é obrigatório.",
      );
    }

    if (Number.isNaN(input.decidedAt.getTime())) {
      throw new ValidationError("A data da decisão é inválida.");
    }

    this._decision = input.decision;
    this._justification = justification;
    this._reviewerId = reviewerId;
    this._decidedAt = new Date(input.decidedAt);
    this._status = "completed";
  }
}
