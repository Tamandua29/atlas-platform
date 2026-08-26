export type ApplicationErrorMetadata = Readonly<Record<string, unknown>>;

export abstract class ApplicationError extends Error {
  abstract readonly code: string;

  readonly metadata?: ApplicationErrorMetadata;

  protected constructor(
    message: string,
    options?: {
      cause?: unknown;
      metadata?: ApplicationErrorMetadata;
    },
  ) {
    super(message, {
      cause: options?.cause,
    });

    this.name = new.target.name;
    this.metadata = options?.metadata;

    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      metadata: this.metadata,
    };
  }
}

export class ValidationError extends ApplicationError {
  readonly code = "VALIDATION_ERROR";

  constructor(message: string, metadata?: ApplicationErrorMetadata) {
    super(message, { metadata });
  }
}

export class NotFoundError extends ApplicationError {
  readonly code = "NOT_FOUND";

  constructor(entityName: string, identifier?: string) {
    super(
      identifier
        ? `${entityName} não encontrado: ${identifier}.`
        : `${entityName} não encontrado.`,
      {
        metadata: {
          entityName,
          identifier,
        },
      },
    );
  }
}

export class ConflictError extends ApplicationError {
  readonly code = "CONFLICT";

  constructor(message: string, metadata?: ApplicationErrorMetadata) {
    super(message, { metadata });
  }
}

export class UnauthorizedError extends ApplicationError {
  readonly code = "UNAUTHORIZED";

  constructor(message = "Acesso não autorizado.") {
    super(message);
  }
}

export class ForbiddenError extends ApplicationError {
  readonly code = "FORBIDDEN";

  constructor(message = "Operação não permitida.") {
    super(message);
  }
}

export class InfrastructureError extends ApplicationError {
  readonly code = "INFRASTRUCTURE_ERROR";

  constructor(
    message: string,
    cause?: unknown,
    metadata?: ApplicationErrorMetadata,
  ) {
    super(message, {
      cause,
      metadata,
    });
  }
}
