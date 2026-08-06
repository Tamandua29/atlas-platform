import { UniqueEntityId } from "../identifiers/unique-entity-id";

export interface DomainEvent<
  TPayload = unknown,
> {
  readonly eventId: UniqueEntityId;
  readonly eventName: string;
  readonly occurredAt: Date;
  readonly aggregateId?: UniqueEntityId;
  readonly payload: TPayload;
  readonly metadata?: Readonly<
    Record<string, unknown>
  >;
}

export type DomainEventOptions = {
  readonly eventId?: UniqueEntityId;
  readonly occurredAt?: Date;
  readonly aggregateId?: UniqueEntityId;
  readonly metadata?: Readonly<
    Record<string, unknown>
  >;
};

export abstract class BaseDomainEvent<
  TPayload,
> implements DomainEvent<TPayload>
{
  readonly eventId: UniqueEntityId;
  readonly occurredAt: Date;
  readonly aggregateId?: UniqueEntityId;
  readonly metadata?: Readonly<
    Record<string, unknown>
  >;

  abstract readonly eventName: string;

  protected constructor(
    readonly payload: TPayload,
    options: DomainEventOptions = {},
  ) {
    this.eventId =
      options.eventId ??
      UniqueEntityId.create();

    this.occurredAt =
      options.occurredAt ??
      new Date();

    this.aggregateId =
      options.aggregateId;

    this.metadata =
      options.metadata;
  }
}

export type DomainEventHandler<
  TEvent extends DomainEvent = DomainEvent,
> = (
  event: TEvent,
) => Promise<void> | void;

export interface EventBus {
  publish<TEvent extends DomainEvent>(
    event: TEvent,
  ): Promise<void>;

  subscribe<TEvent extends DomainEvent>(
    eventName: string,
    handler: DomainEventHandler<TEvent>,
  ): () => void;
}