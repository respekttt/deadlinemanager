import { createHash } from 'node:crypto';
import { IdempotencyConflictError, ValidationError } from '../../domain/errors.js';
import { Task } from '../../domain/task.js';

export function requestHash({ title, dueAt, courseId = null }) {
  return createHash('sha256').update(JSON.stringify({ title, dueAt, courseId })).digest('hex');
}

// S1 (spec §5). Повертає подію; task.replayed не має підписників і нічого не пише.
export class CreateTaskCommand {
  constructor(input, idempotencyKey) {
    this.input = input;
    this.key = idempotencyKey;
  }

  execute({ repos, now }) {
    const hash = this.key && requestHash(this.input);
    const replay = this.#replay(repos, hash);
    if (replay) return replay;

    const task = Task.create(this.input, now);
    if (task.courseId !== null && !repos.courses.findById(task.courseId)) {
      throw new ValidationError(`courseId: курс ${task.courseId} не існує`);
    }
    const saved = new Task(repos.tasks.save(task));
    if (this.key) {
      repos.idempotency.save({
        key: this.key,
        requestHash: hash,
        taskId: saved.id,
        createdAt: now.toISOString(),
      });
    }
    return { type: 'task.created', task: saved };
  }

  #replay(repos, hash) {
    if (!this.key) return null;
    const found = repos.idempotency.find(this.key);
    if (!found) return null;
    if (found.requestHash !== hash) throw new IdempotencyConflictError();
    return { type: 'task.replayed', task: new Task(repos.tasks.findById(found.taskId)) };
  }
}
