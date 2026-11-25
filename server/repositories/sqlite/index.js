// SQLite-реалізації портів (services/ports.js). Лише тут SQL і транзакції (spec §2, §4).
import { log } from '../../context.js';
import { IdempotencyRaceError, SourceUnavailableError } from '../../domain/errors.js';

// Збої джерела → 503 без ретраїв (spec §5, «Помилки»).
const UNAVAILABLE = /^SQLITE_(BUSY|LOCKED|IOERR|CANTOPEN|FULL|READONLY)/;

export function isSourceFailure(err) {
  return UNAVAILABLE.test(err?.code ?? '') || /closed database/i.test(err?.message ?? '');
}

const TASK_SELECT = `SELECT t.id, t.title, t.course_id, c.name AS course_name, t.status,
  t.due_at, t.created_at, t.updated_at
  FROM tasks t LEFT JOIN courses c ON c.id = t.course_id`;

const toTask = (r) =>
  r && {
    id: r.id,
    title: r.title,
    courseId: r.course_id,
    courseName: r.course_name,
    status: r.status,
    dueAt: r.due_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };

const toHistory = (r) => ({
  id: r.id,
  taskId: r.task_id,
  fromStatus: r.from_status,
  toStatus: r.to_status,
  changedBy: r.changed_by,
  changedAt: r.changed_at,
});

export function createSqliteRepos(db) {
  // Один SQL-виклик: лог з операцією, тривалістю, кількістю рядків або кодом помилки (AC-19).
  const sql = (op, fn) => {
    const started = performance.now();
    const ms = () => +(performance.now() - started).toFixed(3);
    try {
      const result = fn();
      const rows = Array.isArray(result) ? result.length : (result?.changes ?? (result ? 1 : 0));
      log.debug({ op, rows, ms: ms() }, 'sql');
      return result;
    } catch (err) {
      log.debug({ op, error: err.code ?? err.name, ms: ms() }, 'sql failed');
      if (isSourceFailure(err)) throw new SourceUnavailableError(err);
      throw err;
    }
  };

  const tasks = {
    save: (task) => {
      if (task.id == null) {
        const { lastInsertRowid } = sql('tasks.insert', () =>
          db
            .query(
              `INSERT INTO tasks (course_id, title, status, due_at, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?)`,
            )
            .run(
              task.courseId,
              task.title,
              task.status,
              task.dueAt,
              task.createdAt,
              task.updatedAt,
            ),
        );
        return tasks.findById(Number(lastInsertRowid));
      }
      sql('tasks.update', () =>
        db
          .query('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?')
          .run(task.status, task.updatedAt, task.id),
      );
      return tasks.findById(task.id);
    },
    findById: (id) =>
      sql('tasks.findById', () => toTask(db.query(`${TASK_SELECT} WHERE t.id = ?`).get(id))),
    // Один запит із JOIN замість findById курсу на кожну задачу (N+1, AC-22).
    list: () => sql('tasks.list', () => db.query(TASK_SELECT).all().map(toTask)),
  };

  const courses = {
    findById: (id) =>
      sql('courses.findById', () => db.query('SELECT id, name FROM courses WHERE id = ?').get(id)),
  };

  const history = {
    append: (e) =>
      sql('history.insert', () =>
        db
          .query(
            `INSERT INTO task_history (task_id, from_status, to_status, changed_by, changed_at)
             VALUES (?, ?, ?, ?, ?)`,
          )
          .run(e.taskId, e.fromStatus, e.toStatus, e.changedBy, e.changedAt),
      ),
    listByTaskId: (taskId) =>
      sql('history.listByTaskId', () =>
        db
          .query('SELECT * FROM task_history WHERE task_id = ? ORDER BY changed_at, id')
          .all(taskId)
          .map(toHistory),
      ),
  };

  const idempotency = {
    find: (key) =>
      sql('idempotency.find', () => {
        const r = db
          .query('SELECT key, request_hash, task_id FROM idempotency_keys WHERE key = ?')
          .get(key);
        return r && { key: r.key, requestHash: r.request_hash, taskId: r.task_id };
      }),
    save: (e) => {
      try {
        sql('idempotency.insert', () =>
          db
            .query(
              'INSERT INTO idempotency_keys (key, request_hash, task_id, created_at) VALUES (?, ?, ?, ?)',
            )
            .run(e.key, e.requestHash, e.taskId, e.createdAt),
        );
      } catch (err) {
        // Ключ між find і insert зайняв паралельний запит: сервіс повторить команду (spec §5, S1).
        if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') throw new IdempotencyRaceError();
        throw err;
      }
    },
  };

  // BEGIN … COMMIT; виняток усередині fn → ROLLBACK і повторний кидок.
  const transaction = (fn) => {
    try {
      const result = db.transaction(fn)();
      log.debug({ op: 'transaction', result: 'commit' }, 'sql');
      return result;
    } catch (err) {
      log.debug({ op: 'transaction', result: 'rollback', error: err.code ?? err.name }, 'sql');
      throw isSourceFailure(err) ? new SourceUnavailableError(err) : err;
    }
  };

  return { tasks, courses, history, idempotency, transaction };
}
