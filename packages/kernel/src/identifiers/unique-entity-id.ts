import { ValidationError } from "../errors/application-error";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class UniqueEntityId {
  private constructor(
    private readonly internalValue: string,
  ) {}

  static create(value?: string): UniqueEntityId {
    const identifier =
      value ?? globalThis.crypto.randomUUID();

    if (!UUID_PATTERN.test(identifier)) {
      throw new ValidationError(
        "O identificador informado não é um UUID válido.",
        {
          value: identifier,
        },
      );
    }

    return new UniqueEntityId(
      identifier.toLowerCase(),
    );
  }

  get value(): string {
    return this.internalValue;
  }

  equals(
    other: UniqueEntityId | null | undefined,
  ): boolean {
    if (!other) {
      return false;
    }

    return (
      this.internalValue ===
      other.internalValue
    );
  }

  toString(): string {
    return this.internalValue;
  }

  toJSON(): string {
    return this.internalValue;
  }
}