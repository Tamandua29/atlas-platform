import { ValidationError } from "../errors/application-error";
import { UniqueEntityId } from "../identifiers/unique-entity-id";

export type AuditOutcome =
  | "success"
  | "partial"
  | "failure";

export type AuditEntryInput = {
  readonly action: string;
  readonly outcome: AuditOutcome;
  readonly occurredAt: Date;
  readonly correlationId?: string;
  readonly processedCount?: number;
  readonly successCount?: number;
  readonly failureCount?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
};

const SENSITIVE_KEY_SEGMENTS = new Set([
  "cpf",
  "rg",
  "password",
  "senha",
  "token",
  "secret",
  "documento",
]);

function isSensitiveMetadataKey(key: string): boolean {
  const segments = key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .split(/[^a-z0-9áàâãéèêíïóôõöúç]+/)
    .filter(Boolean);

  return segments.some((segment) => SENSITIVE_KEY_SEGMENTS.has(segment));
}

export class AuditEntry {
  readonly id: UniqueEntityId;
  readonly action: string;
  readonly outcome: AuditOutcome;
  readonly occurredAt: Date;
  readonly correlationId: string;
  readonly processedCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly metadata?: Readonly<Record<string, unknown>>;

  private constructor(input: AuditEntryInput) {
    this.id = UniqueEntityId.create();
    this.action = input.action.trim();
    this.outcome = input.outcome;
    this.occurredAt = new Date(input.occurredAt);
    this.correlationId =
      input.correlationId?.trim() ||
      this.id.value;
    this.processedCount = input.processedCount ?? 0;
    this.successCount = input.successCount ?? 0;
    this.failureCount = input.failureCount ?? 0;
    this.metadata = input.metadata;
  }

  static create(input: AuditEntryInput): AuditEntry {
    if (!input.action.trim()) {
      throw new ValidationError("A ação de auditoria é obrigatória.");
    }

    const counts = [
      input.processedCount,
      input.successCount,
      input.failureCount,
    ];

    if (counts.some((value) => value !== undefined && (!Number.isInteger(value) || value < 0))) {
      throw new ValidationError("As contagens de auditoria devem ser inteiros não negativos.");
    }

    const sensitiveKey = Object.keys(input.metadata ?? {}).find(
      isSensitiveMetadataKey,
    );

    if (sensitiveKey) {
      throw new ValidationError("Metadado sensível não pode ser registrado na auditoria.", {
        field: sensitiveKey,
      });
    }

    return new AuditEntry(input);
  }
}
