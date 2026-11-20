// Observer: синхронні підписники виконуються в тій самій транзакції, що й команда.
export class EventBus {
  constructor() {
    this.subscribers = new Map();
  }

  subscribe(type, fn) {
    this.subscribers.set(type, [...(this.subscribers.get(type) ?? []), fn]);
  }

  publish(event, deps) {
    for (const fn of this.subscribers.get(event.type) ?? []) fn(event, deps);
  }
}
