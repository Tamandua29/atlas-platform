import type { Result } from "../result/result";

export interface Command {
  readonly commandName: string;
}

export interface CommandHandler<
  TCommand extends Command,
  TResult,
  TError = Error,
> {
  execute(command: TCommand): Promise<Result<TResult, TError>>;
}

export interface CommandBus {
  execute<TCommand extends Command, TResult, TError = Error>(
    command: TCommand,
  ): Promise<Result<TResult, TError>>;
}
