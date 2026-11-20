import { afterEach, expect, test } from 'bun:test';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDb } from '../server/db/index.js';
import { buildApp } from '../server/main.js';
import { isSourceFailure } from '../server/repositories/sqlite/index.js';
import { requestHash } from '../server/services/commands/create-task.js';
import { FUTURE, NOW, setup, task } from './helpers.js';

let ctx;
let cleanup = () => {};
afterEach(async () => {
  await ctx?.app.close();
  cleanup();
  cleanup = () => {};
});

const valid = { title: 'Лабораторна 3', dueAt: FUTURE, courseId: 1 };
const sqlLines = (id) =>
  ctx.logs.filter((l) => l.requestId === id && l.msg === 'sql' && l.op !== 'transaction');

test('AC-21: закрите підключення → 503 SOURCE_UNAVAILABLE з requestId', async () => {
  ctx = setup({ store: 'sqlite' });
  ctx.db.close();
  const res = await ctx.call('GET', '/tasks');
  expect(res.statusCode).toBe(503);
  expect(res.json().error).toMatchObject({
    code: 'SOURCE_UNAVAILABLE',
    requestId: res.headers['x-request-id'],
  });
});

test('AC-21: SQLITE_BUSY (БД заблокована іншим підключенням) → 503 без ретраїв, нічого не записано', async () => {
  const path = join(tmpdir(), `deadlinehub-busy-${process.pid}.db`);
  const db = openDb(path);
  const other = openDb(path);
  cleanup = () => {
    other.close();
    for (const suffix of ['', '-wal', '-shm']) rmSync(path + suffix, { force: true });
  };
  const logs = [];
  const logger = { level: 'debug', stream: { write: (l) => logs.push(JSON.parse(l)) } };
  ctx = { app: buildApp({ db, now: () => NOW, logger }), logs };

  other.run('BEGIN IMMEDIATE');
  const res = await ctx.app.inject({ method: 'POST', url: '/tasks', payload: valid });
  other.run('ROLLBACK');

  expect(res.statusCode).toBe(503);
  expect(res.json().error.code).toBe('SOURCE_UNAVAILABLE');
  expect(
    logs.some((l) => l.error === 'SQLITE_BUSY' && l.requestId === res.headers['x-request-id']),
  ).toBe(true);
  expect(other.query('SELECT COUNT(*) AS n FROM tasks').get().n).toBe(0);
});

test('AC-21: непередбачена помилка БД → 500 INTERNAL без стека й SQL у тілі', async () => {
  ctx = setup({ store: 'sqlite', tasks: [task()] });
  ctx.db.run('DROP TABLE task_history');
  const res = await ctx.call('PATCH', '/tasks/1/status', { status: 'in_progress' });
  expect(res.statusCode).toBe(500);
  const { error } = res.json();
  expect(error).toEqual({
    code: 'INTERNAL',
    message: 'Внутрішня помилка сервера',
    requestId: res.headers['x-request-id'],
  });
  expect(ctx.repos.tasks.findById(1).status).toBe('todo'); // транзакцію відкочено
});

test('AC-22: GET /tasks — рівно один SQL-запит для N задач, courseName заповнено', async () => {
  const tasks = [1, 2, 3, 2, null].map((courseId, i) => task({ id: i + 1, courseId }));
  ctx = setup({ store: 'sqlite', tasks });
  const res = await ctx.call('GET', '/tasks');
  const list = res.json();
  expect(list).toHaveLength(5);
  expect(list.map((t) => t.courseName)).toEqual([
    'Програмування',
    'Бази даних',
    'Математичний аналіз',
    'Бази даних',
    null,
  ]);
  expect(sqlLines(res.headers['x-request-id']).map((l) => l.op)).toEqual(['tasks.list']);
});

test('isSourceFailure: лише збої джерела, не помилки запиту', () => {
  expect(isSourceFailure({ code: 'SQLITE_BUSY' })).toBe(true);
  expect(isSourceFailure({ code: 'SQLITE_IOERR_WRITE' })).toBe(true);
  expect(isSourceFailure(new RangeError('Cannot use a closed database'))).toBe(true);
  expect(isSourceFailure({ code: 'SQLITE_CONSTRAINT_PRIMARYKEY' })).toBe(false);
  expect(isSourceFailure({ code: 'SQLITE_ERROR' })).toBe(false);
  expect(isSourceFailure(undefined)).toBe(false);
});

// Гонка: ключ зайняв паралельний процес між find і insert (find уперше «не бачить» ключа).
function raceSetup(hash) {
  ctx = setup({ store: 'sqlite' });
  const find = ctx.repos.idempotency.find;
  let calls = 0;
  ctx.repos.idempotency.find = (key) => (++calls === 1 ? null : find(key));
  ctx.db.run(
    "INSERT INTO tasks (id, title, course_id, status, due_at, created_at, updated_at) VALUES (99, 'Лабораторна 3', 1, 'todo', ?, ?, ?)",
    [FUTURE, FUTURE, FUTURE],
  );
  ctx.db.run(
    "INSERT INTO idempotency_keys (key, request_hash, task_id, created_at) VALUES ('k', ?, 99, ?)",
    [hash, FUTURE],
  );
  return () => calls;
}

test('гонка Idempotency-Key, те саме тіло → повтор команди → 201 з задачею паралельного запиту', async () => {
  const calls = raceSetup(requestHash(valid));
  const res = await ctx.call('POST', '/tasks', valid, { 'idempotency-key': 'k' });
  expect(res.statusCode).toBe(201);
  expect(res.json().id).toBe(99);
  expect(calls()).toBe(2);
  expect(ctx.repos.tasks.list().map((t) => t.id)).toEqual([99]); // першу спробу відкочено
  expect(ctx.repos.history.listByTaskId(100)).toEqual([]);
});

test('гонка Idempotency-Key, інше тіло → 409 IDEMPOTENCY_CONFLICT', async () => {
  raceSetup('інший-хеш');
  const res = await ctx.call('POST', '/tasks', valid, { 'idempotency-key': 'k' });
  expect(res.statusCode).toBe(409);
  expect(ctx.repos.tasks.list().map((t) => t.id)).toEqual([99]);
});
