// Доменні помилки. HTTP-статус для кожного code визначає setErrorHandler у main.js (spec §5).
export class DomainError extends Error {
  constructor(code, message) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

export class ValidationError extends DomainError {
  constructor(message) {
    super('VALIDATION_ERROR', message);
  }
}

export class InvalidTransitionError extends DomainError {
  constructor(from, to) {
    super('INVALID_TRANSITION', `Перехід ${from} → ${to} заборонено`);
  }
}

export class NotFoundError extends DomainError {
  constructor(what) {
    super('NOT_FOUND', `${what} не знайдено`);
  }
}

export class IdempotencyConflictError extends DomainError {
  constructor() {
    super('IDEMPOTENCY_CONFLICT', 'Idempotency-Key уже використано з іншим тілом запиту');
  }
}

export class SourceUnavailableError extends DomainError {
  constructor(cause) {
    super('SOURCE_UNAVAILABLE', 'Сховище даних тимчасово недоступне');
    this.cause = cause;
  }
}

// Внутрішня: ключ зайняв паралельний запит між find і insert. TaskService перезапускає команду (spec §5, S1).
export class IdempotencyRaceError extends DomainError {
  constructor() {
    super('IDEMPOTENCY_RACE', 'Idempotency-Key зайнято паралельним запитом');
  }
}
