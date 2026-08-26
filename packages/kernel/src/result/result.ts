export type ResultState<TValue, TError> =
  | {
      readonly success: true;
      readonly value: TValue;
    }
  | {
      readonly success: false;
      readonly error: TError;
    };

export class Result<TValue, TError = Error> {
  private constructor(private readonly state: ResultState<TValue, TError>) {}

  static ok<TValue, TError = never>(value: TValue): Result<TValue, TError> {
    return new Result<TValue, TError>({
      success: true,
      value,
    });
  }

  static fail<TValue = never, TError = Error>(
    error: TError,
  ): Result<TValue, TError> {
    return new Result<TValue, TError>({
      success: false,
      error,
    });
  }

  get isSuccess(): boolean {
    return this.state.success;
  }

  get isFailure(): boolean {
    return !this.state.success;
  }

  get value(): TValue {
    if (!this.state.success) {
      throw new Error(
        "Não é possível obter o valor de um resultado com falha.",
      );
    }

    return this.state.value;
  }

  get error(): TError {
    if (this.state.success) {
      throw new Error(
        "Não é possível obter o erro de um resultado bem-sucedido.",
      );
    }

    return this.state.error;
  }

  map<TMapped>(mapper: (value: TValue) => TMapped): Result<TMapped, TError> {
    if (this.state.success) {
      return Result.ok<TMapped, TError>(mapper(this.state.value));
    }

    return Result.fail<TMapped, TError>(this.state.error);
  }

  mapError<TMappedError>(
    mapper: (error: TError) => TMappedError,
  ): Result<TValue, TMappedError> {
    if (!this.state.success) {
      return Result.fail<TValue, TMappedError>(mapper(this.state.error));
    }

    return Result.ok<TValue, TMappedError>(this.state.value);
  }

  flatMap<TMapped>(
    mapper: (value: TValue) => Result<TMapped, TError>,
  ): Result<TMapped, TError> {
    if (this.state.success) {
      return mapper(this.state.value);
    }

    return Result.fail<TMapped, TError>(this.state.error);
  }

  getOrElse(fallback: TValue): TValue {
    return this.state.success ? this.state.value : fallback;
  }

  match<TResult>(handlers: {
    success: (value: TValue) => TResult;
    failure: (error: TError) => TResult;
  }): TResult {
    if (this.state.success) {
      return handlers.success(this.state.value);
    }

    return handlers.failure(this.state.error);
  }
}
