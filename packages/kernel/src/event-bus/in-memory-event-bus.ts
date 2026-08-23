import type {
  DomainEvent,
  DomainEventHandler,
  EventBus,
} from "../domain-events/domain-event";

type RegisteredHandler =
  DomainEventHandler<DomainEvent>;

export class InMemoryEventBus
  implements EventBus
{
  private readonly handlers =
    new Map<
      string,
      Set<RegisteredHandler>
    >();

  subscribe<
    TEvent extends DomainEvent,
  >(
    eventName: string,
    handler: DomainEventHandler<TEvent>,
  ): () => void {
    const registeredHandler =
      handler as RegisteredHandler;

    const eventHandlers =
      this.handlers.get(eventName) ??
      new Set<RegisteredHandler>();

    eventHandlers.add(
      registeredHandler,
    );

    this.handlers.set(
      eventName,
      eventHandlers,
    );

    return () => {
      this.unsubscribe(
        eventName,
        registeredHandler,
      );
    };
  }

  async publish<
    TEvent extends DomainEvent,
  >(
    event: TEvent,
  ): Promise<void> {
    const eventHandlers =
      this.handlers.get(
        event.eventName,
      );

    if (
      !eventHandlers ||
      eventHandlers.size === 0
    ) {
      return;
    }

    const executions = Array.from(
      eventHandlers,
    ).map(
      async (handler) => {
        await handler(event);
      },
    );

    await Promise.all(executions);
  }

  async publishAll(
    events: readonly DomainEvent[],
  ): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  clear(): void {
    this.handlers.clear();
  }

  countHandlers(
    eventName?: string,
  ): number {
    if (eventName) {
      return (
        this.handlers.get(eventName)
          ?.size ?? 0
      );
    }

    let total = 0;

    for (
      const eventHandlers
      of this.handlers.values()
    ) {
      total += eventHandlers.size;
    }

    return total;
  }

  private unsubscribe(
    eventName: string,
    handler: RegisteredHandler,
  ): void {
    const eventHandlers =
      this.handlers.get(eventName);

    if (!eventHandlers) {
      return;
    }

    eventHandlers.delete(handler);

    if (
      eventHandlers.size === 0
    ) {
      this.handlers.delete(
        eventName,
      );
    }
  }
}