import { log } from '../context.js';
import { NotFoundError } from '../domain/errors.js';
import { Task } from '../domain/task.js';

// Бізнес-операції над задачами. Ресурси — через конструктор, ініціатор і requestId — з контексту (ADR 0010).
export class TaskService {
  constructor({ repos, events, strategies, now = () => new Date() }) {
    Object.assign(this, { repos, events, strategies, now });
  }

  run(command) {
    const now = this.now();
    const event = this.#execute(command, now);
    log.info({ event: event.type, taskId: event.task.id }, 'business event');
    return event.task.toView(now);
  }

  // Гонка за Idempotency-Key: транзакцію відкочено, повтор потрапляє в replay (201 або 409, spec §5, S1).
  #execute(command, now, attempt = 1) {
    try {
      return this.repos.transaction(() => {
        const ev = command.execute({ repos: this.repos, now });
        this.events.publish(ev, { repos: this.repos, now });
        return ev;
      });
    } catch (err) {
      if (err.code !== 'IDEMPOTENCY_RACE' || attempt > 1) throw err;
      log.warn({ code: err.code }, 'idempotency race, re-running command');
      return this.#execute(command, now, attempt + 1);
    }
  }

  get(id) {
    return this.#find(id).toView(this.now());
  }

  list(query) {
    const now = this.now();
    let tasks = this.repos.tasks.list().map((r) => new Task(r));
    for (const [param, strategy] of Object.entries(this.strategies)) {
      if (query[param] !== undefined) tasks = strategy.apply(tasks, { now, value: query[param] });
    }
    return tasks.map((t) => t.toView(now));
  }

  history(id) {
    this.#find(id);
    return this.repos.history.listByTaskId(id);
  }

  #find(id) {
    const record = this.repos.tasks.findById(id);
    if (!record) throw new NotFoundError(`Задачу ${id}`);
    return new Task(record);
  }
}
