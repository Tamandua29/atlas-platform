import type { Result } from "../result/result";

export interface Query {
  readonly queryName: string;
}

export interface QueryHandler<TQuery extends Query, TResult, TError = Error> {
  execute(query: TQuery): Promise<Result<TResult, TError>>;
}

export interface QueryBus {
  execute<TQuery extends Query, TResult, TError = Error>(
    query: TQuery,
  ): Promise<Result<TResult, TError>>;
}
