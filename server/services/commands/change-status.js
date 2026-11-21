import { NotFoundError } from '../../domain/errors.js';
import { Task } from '../../domain/task.js';

// S2 (spec §5).
export class ChangeStatusCommand {
  constructor(id, status) {
    this.id = id;
    this.status = status;
  }

  execute({ repos, now }) {
    const record = repos.tasks.findById(this.id);
    if (!record) throw new NotFoundError(`Задачу ${this.id}`);
    const task = new Task(record);
    const from = task.changeStatus(this.status, now);
    repos.tasks.save(task);
    return { type: 'task.status_changed', task, from };
  }
}
