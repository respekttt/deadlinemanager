// In-memory реалізації портів (services/ports.js): прототип без БД і unit-тести (spec §5, «Етапи»).
import { log } from '../../context.js';

export const fixtureCourses = [
  { id: 1, name: 'Програмування' },
  { id: 2, name: 'Бази даних' },
  { id: 3, name: 'Математичний аналіз' },
];

const clone = (value) => structuredClone(value);

export function createMemoryRepos({ courses = fixtureCourses, tasks = [] } = {}) {
  let state = {
    courses: clone(courses),
    tasks: clone(tasks),
    history: [],
    keys: [],
    seq: { task: 0, history: 0 },
  };
  state.seq.task = Math.max(0, ...state.tasks.map((t) => t.id));

  // Кожна операція логується з результатом; requestId додає логер із контексту (AC-19).
  const op = (name, fn) => {
    const started = performance.now();
    const result = fn();
    const rows = Array.isArray(result) ? result.length : result ? 1 : 0;
    log.debug({ op: name, rows, ms: +(performance.now() - started).toFixed(3) }, 'memory op');
    return result;
  };

  const withCourse = (t) => ({
    ...t,
    courseName: state.courses.find((c) => c.id === t.courseId)?.name ?? null,
  });
  const plain = ({ id, title, courseId, status, dueAt, createdAt, updatedAt }) => ({
    id,
    title,
    courseId,
    status,
    dueAt,
    createdAt,
    updatedAt,
  });

  const tasksRepo = {
    save: (task) =>
      op('tasks.save', () => {
        if (task.id == null) {
          const record = { ...plain(task), id: ++state.seq.task };
          state.tasks.push(record);
          return withCourse(record);
        }
        const i = state.tasks.findIndex((t) => t.id === task.id);
        state.tasks[i] = plain(task);
        return withCourse(state.tasks[i]);
      }),
    findById: (id) =>
      op('tasks.findById', () => {
        const t = state.tasks.find((x) => x.id === id);
        return t ? withCourse(clone(t)) : null;
      }),
    list: () => op('tasks.list', () => state.tasks.map((t) => withCourse(clone(t)))),
  };

  const coursesRepo = {
    findById: (id) =>
      op('courses.findById', () => clone(state.courses.find((c) => c.id === id) ?? null)),
  };

  const historyRepo = {
    append: (entry) =>
      op('history.append', () => {
        state.history.push({ id: ++state.seq.history, ...entry });
      }),
    listByTaskId: (taskId) =>
      op('history.listByTaskId', () =>
        state.history
          .filter((h) => h.taskId === taskId)
          .sort((a, b) => a.changedAt.localeCompare(b.changedAt) || a.id - b.id)
          .map(clone),
      ),
  };

  const idempotencyRepo = {
    find: (key) =>
      op('idempotency.find', () => clone(state.keys.find((k) => k.key === key) ?? null)),
    save: (entry) =>
      op('idempotency.save', () => {
        state.keys.push({ ...entry });
      }),
  };

  // Транзакція: знімок стану й відновлення на виняток (аналог ROLLBACK).
  const transaction = (fn) => {
    const snapshot = clone(state);
    try {
      return fn();
    } catch (err) {
      state = snapshot;
      log.debug({ op: 'transaction', result: 'rollback' }, 'memory op');
      throw err;
    }
  };

  return {
    tasks: tasksRepo,
    courses: coursesRepo,
    history: historyRepo,
    idempotency: idempotencyRepo,
    transaction,
  };
}
