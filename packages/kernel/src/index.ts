export const ATLAS_KERNEL_VERSION =
  "0.2.0";

export {
  Result,
} from "./result/result";

export type {
  ResultState,
} from "./result/result";

export {
  ApplicationError,
  ConflictError,
  ForbiddenError,
  InfrastructureError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "./errors/application-error";

export type {
  ApplicationErrorMetadata,
} from "./errors/application-error";

export {
  UniqueEntityId,
} from "./identifiers/unique-entity-id";

export {
  FixedClock,
  SystemClock,
} from "./clock/clock";

export type {
  Clock,
} from "./clock/clock";

export {
  BaseDomainEvent,
} from "./domain-events/domain-event";

export type {
  DomainEvent,
  DomainEventHandler,
  DomainEventOptions,
  EventBus,
} from "./domain-events/domain-event";

export {
  InMemoryEventBus,
} from "./event-bus";

export type {
  Command,
  CommandBus,
  CommandHandler,
} from "./commands/command";

export type {
  Query,
  QueryBus,
  QueryHandler,
} from "./queries/query";