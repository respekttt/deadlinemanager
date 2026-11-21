import { InvalidTransitionError, ValidationError } from './errors.js';
import { stateOf } from './states.js';

const TITLE_MIN = 3;
const TITLE_MAX = 120;

export class Task {
  constructor({
    id,
    title,
    courseId = null,
    courseName = null,
    status,
    dueAt,
    createdAt,
    updatedAt,
  }) {
    Object.assign(this, { id, title, courseId, courseName, status, dueAt, createdAt, updatedAt });
  }

  // Нова задача: правила, які JSON Schema не виражає (spec §5, S1 крок 4).
  static create({ title, dueAt, courseId = null }, now) {
    const trimmed = title.trim();
    if (trimmed.length < TITLE_MIN || trimmed.length > TITLE_MAX) {
      throw new ValidationError(`title: від ${TITLE_MIN} до ${TITLE_MAX} символів після trim`);
    }
    const due = new Date(dueAt);
    if (Number.isNaN(due.getTime()) || due <= now) {
      throw new ValidationError('dueAt: має бути коректною датою в майбутньому');
    }
    const at = now.toISOString();
    return new Task({
      title: trimmed,
      courseId,
      status: 'todo',
      dueAt: due.toISOString(),
      createdAt: at,
      updatedAt: at,
    });
  }

  changeStatus(to, now) {
    if (!stateOf(this.status).canTransitionTo(to))
      throw new InvalidTransitionError(this.status, to);
    const from = this.status;
    this.status = to;
    this.updatedAt = now.toISOString();
    return from;
  }

  isOverdue(now) {
    return this.status !== 'done' && new Date(this.dueAt) < now;
  }

  toView(now) {
    return { ...this, overdue: this.isOverdue(now) };
  }
}
