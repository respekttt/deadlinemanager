import { openDb } from '../server/db/index.js';
import { buildApp } from '../server/main.js';
import { createMemoryRepos } from '../server/repositories/memory/index.js';
import { createSqliteRepos } from '../server/repositories/sqlite/index.js';

export const NOW = new Date('2026-11-20T12:00:00.000Z');
export const FUTURE = '2026-12-01T21:00:00.000Z';
export const STORES = ['memory', 'sqlite'];

function seedSqlite(db, tasks) {
  const insert = db.query(
    `INSERT INTO tasks (id, course_id, title, status, due_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const t of tasks) {
    insert.run(t.id, t.courseId, t.title, t.status, t.dueAt, t.createdAt, t.updatedAt);
  }
}

// Застосунок на обраному сховищі з фіксованим часом; logs — розібрані рядки логу (level debug).
export function setup({ store = 'memory', tasks = [], now = NOW, ...opts } = {}) {
  let db;
  let repos;
  if (store === 'sqlite') {
    db = openDb(':memory:');
    seedSqlite(db, tasks);
    repos = createSqliteRepos(db);
  } else {
    repos = createMemoryRepos({ tasks });
  }
  const logs = [];
  const clock = { now };
  const logger = { level: 'debug', stream: { write: (line) => logs.push(JSON.parse(line)) } };
  const app = buildApp({ repos, db, now: () => clock.now, logger, ...opts });
  const call = (method, url, payload, headers) => app.inject({ method, url, payload, headers });
  return { app, db, repos, logs, clock, call };
}

export const task = (overrides = {}) => ({
  id: 1,
  title: 'Лабораторна 3',
  courseId: 1,
  status: 'todo',
  dueAt: FUTURE,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  ...overrides,
});
