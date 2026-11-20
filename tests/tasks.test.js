import { afterEach, describe, expect, test } from 'bun:test';
import { FUTURE, NOW, setup, task } from './helpers.js';

let ctx;
afterEach(() => ctx?.app.close());

const create = (body, headers) => ctx.call('POST', '/tasks', body, headers);
const valid = { title: 'Лабораторна 3', dueAt: FUTURE, courseId: 1 };

describe('S1: POST /tasks', () => {
  test('AC-1: валідні дані → 201, status = todo, один запис історії NULL → todo', async () => {
    ctx = setup();
    const res = await create(valid);
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toMatchObject({
      id: 1,
      status: 'todo',
      courseId: 1,
      courseName: 'Програмування',
      overdue: false,
    });
    expect(body.createdAt).toBe(NOW.toISOString());
    expect(ctx.repos.history.listByTaskId(1)).toMatchObject([
      { fromStatus: null, toStatus: 'todo' },
    ]);
  });

  test.each(['ab', '  ab  ', 'x'.repeat(121)])(
    'AC-2: title %p → 400 VALIDATION_ERROR, нічого не записано',
    async (title) => {
      ctx = setup();
      const res = await create({ ...valid, title });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
      expect(ctx.repos.tasks.list()).toEqual([]);
    },
  );

  test.each([undefined, 'не дата', '2026-11-20T11:59:59.000Z', NOW.toISOString()])(
    'AC-3: dueAt %p → 400 VALIDATION_ERROR',
    async (dueAt) => {
      ctx = setup();
      const res = await create({ ...valid, dueAt });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    },
  );

  test('AC-4: неіснуючий courseId → 400; відсутній або null → 201 з courseId: null', async () => {
    ctx = setup();
    expect((await create({ ...valid, courseId: 99 })).statusCode).toBe(400);
    for (const body of [
      { title: valid.title, dueAt: FUTURE },
      { ...valid, courseId: null },
    ]) {
      const res = await create(body);
      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ courseId: null, courseName: null });
    }
  });

  test('невалідний JSON → 400 VALIDATION_ERROR', async () => {
    ctx = setup();
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/tasks',
      payload: '{',
      headers: { 'content-type': 'application/json' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /tasks/:id і список', () => {
  test('AC-5: GET /tasks/:id → 200 для існуючої, 404 NOT_FOUND для неіснуючої', async () => {
    ctx = setup({ tasks: [task()] });
    const ok = await ctx.call('GET', '/tasks/1');
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ id: 1, courseName: 'Програмування' });
    const missing = await ctx.call('GET', '/tasks/2');
    expect(missing.statusCode).toBe(404);
    expect(missing.json().error.code).toBe('NOT_FOUND');
  });

  const sample = [
    task({ id: 1, courseId: 1, status: 'todo', dueAt: '2026-12-03T00:00:00.000Z' }),
    task({ id: 2, courseId: 2, status: 'in_progress', dueAt: '2026-12-01T00:00:00.000Z' }),
    task({ id: 3, courseId: 1, status: 'in_progress', dueAt: '2026-11-10T00:00:00.000Z' }),
    task({ id: 4, courseId: null, status: 'done', dueAt: '2026-11-01T00:00:00.000Z' }),
  ];

  test('AC-6: фільтри status і courseId діють разом; невідомий status → 400', async () => {
    ctx = setup({ tasks: sample });
    const res = await ctx.call('GET', '/tasks?status=in_progress&courseId=1');
    expect(res.json().map((t) => t.id)).toEqual([3]);
    expect((await ctx.call('GET', '/tasks?status=archived')).statusCode).toBe(400);
  });

  test('AC-7: сортування за dueAt; overdue лише для невиконаних із dueAt < now', async () => {
    ctx = setup({ tasks: sample });
    const list = (await ctx.call('GET', '/tasks')).json();
    expect(list.map((t) => t.id)).toEqual([4, 3, 2, 1]);
    expect(list.map((t) => t.overdue)).toEqual([false, true, false, false]);
  });

  test('AC-8: overdue=true повертає лише прострочені', async () => {
    ctx = setup({ tasks: sample });
    expect((await ctx.call('GET', '/tasks?overdue=true')).json().map((t) => t.id)).toEqual([3]);
    expect((await ctx.call('GET', '/tasks?overdue=false')).json()).toHaveLength(4);
  });
});

describe('S2: PATCH /tasks/:id/status', () => {
  const patch = (status, id = 1) => ctx.call('PATCH', `/tasks/${id}/status`, { status });

  test.each([
    ['todo', 'in_progress'],
    ['in_progress', 'done'],
    ['in_progress', 'todo'],
  ])('AC-9: %s → %s → 200, updatedAt оновлено', async (from, to) => {
    ctx = setup({ tasks: [task({ status: from })] });
    const res = await patch(to);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: to, updatedAt: NOW.toISOString() });
    expect(ctx.repos.history.listByTaskId(1)).toMatchObject([{ fromStatus: from, toStatus: to }]);
  });

  test.each([
    ['todo', 'done'],
    ['done', 'todo'],
    ['done', 'in_progress'],
    ['todo', 'todo'],
    ['todo', 'archived'],
  ])('AC-10: %s → %s → 400, tasks і task_history без змін', async (from, to) => {
    const original = task({ status: from });
    ctx = setup({ tasks: [original] });
    const res = await patch(to);
    expect(res.statusCode).toBe(400);
    expect(ctx.repos.tasks.findById(1)).toMatchObject({
      status: from,
      updatedAt: original.updatedAt,
    });
    expect(ctx.repos.history.listByTaskId(1)).toEqual([]);
  });

  test('AC-11: неіснуюча задача → 404', async () => {
    ctx = setup();
    expect((await patch('in_progress', 42)).statusCode).toBe(404);
  });

  test('AC-12: падіння запису історії відкочує зміну статусу', async () => {
    ctx = setup({ tasks: [task()] });
    ctx.repos.history.append = () => {
      throw new Error('disk full');
    };
    const res = await patch('in_progress');
    expect(res.statusCode).toBe(500);
    expect(ctx.repos.tasks.findById(1).status).toBe('todo');
  });
});

describe('S4: GET /tasks/:id/history', () => {
  test('AC-13: усі зміни в хронологічному порядку; 404 для неіснуючої задачі', async () => {
    ctx = setup();
    await create(valid);
    ctx.clock.now = new Date('2026-11-21T00:00:00.000Z');
    await ctx.call('PATCH', '/tasks/1/status', { status: 'in_progress' });
    ctx.clock.now = new Date('2026-11-22T00:00:00.000Z');
    await ctx.call('PATCH', '/tasks/1/status', { status: 'done' });
    const res = await ctx.call('GET', '/tasks/1/history');
    expect(res.json().map((h) => [h.fromStatus, h.toStatus])).toEqual([
      [null, 'todo'],
      ['todo', 'in_progress'],
      ['in_progress', 'done'],
    ]);
    expect((await ctx.call('GET', '/tasks/9/history')).statusCode).toBe(404);
  });
});

describe('Ідемпотентність', () => {
  test('AC-17: повтор з тим самим Idempotency-Key і тілом → 201 з тим самим id, без дублів', async () => {
    ctx = setup();
    const headers = { 'idempotency-key': 'k-1' };
    const first = await create(valid, headers);
    const second = await create(valid, headers);
    expect(second.statusCode).toBe(201);
    expect(second.json().id).toBe(first.json().id);
    expect(ctx.repos.tasks.list()).toHaveLength(1);
    expect(ctx.repos.history.listByTaskId(1)).toHaveLength(1);
  });

  test('AC-18: той самий ключ з іншим тілом → 409; невалідний запит ключ не займає', async () => {
    ctx = setup();
    const headers = { 'idempotency-key': 'k-2' };
    expect((await create({ ...valid, title: 'ab' }, headers)).statusCode).toBe(400);
    expect((await create(valid, headers)).statusCode).toBe(201);
    const conflict = await create({ ...valid, title: 'Інша назва' }, headers);
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json().error.code).toBe('IDEMPOTENCY_CONFLICT');
    expect(ctx.repos.tasks.list()).toHaveLength(1);
  });
});

describe('Контекст і логи', () => {
  test('AC-19: усі рядки логу запиту мають requestId = X-Request-Id відповіді', async () => {
    ctx = setup({ tasks: [task({ status: 'done' })] });
    const ok = await create(valid);
    const rejected = await ctx.call('PATCH', '/tasks/1/status', { status: 'todo' });
    for (const res of [ok, rejected]) {
      const id = res.headers['x-request-id'];
      expect(res.statusCode === 201 || res.json().error.requestId === id).toBe(true);
      const lines = ctx.logs.filter((l) => l.requestId === id);
      expect(lines.some((l) => l.op)).toBe(true); // операції репозиторію
      expect(ctx.logs.filter((l) => l.op || l.event).every((l) => l.requestId)).toBe(true);
    }
    expect(
      ctx.logs.some(
        (l) => l.event === 'task.created' && l.requestId === ok.headers['x-request-id'],
      ),
    ).toBe(true);
    expect(
      ctx.logs.some(
        (l) => l.code === 'INVALID_TRANSITION' && l.requestId === rejected.headers['x-request-id'],
      ),
    ).toBe(true);
  });

  test('AC-19: вхідний X-Request-Id зберігається', async () => {
    ctx = setup();
    const res = await ctx.call('GET', '/tasks', undefined, { 'x-request-id': 'trace-42' });
    expect(res.headers['x-request-id']).toBe('trace-42');
    expect(ctx.logs.filter((l) => l.op === 'tasks.list').map((l) => l.requestId)).toEqual([
      'trace-42',
    ]);
  });

  test('AC-20: X-User-Id → task_history.changed_by і лог; без заголовка — anonymous', async () => {
    ctx = setup();
    await create(valid, { 'x-user-id': 'denys' });
    await create(valid);
    expect(ctx.repos.history.listByTaskId(1)[0].changedBy).toBe('denys');
    expect(ctx.repos.history.listByTaskId(2)[0].changedBy).toBe('anonymous');
    expect(ctx.logs.some((l) => l.op === 'history.append' && l.userId === 'denys')).toBe(true);
  });
});

describe('Помилки', () => {
  test('непередбачена помилка → 500 INTERNAL без деталей у тілі, з requestId', async () => {
    ctx = setup();
    ctx.repos.tasks.list = () => {
      throw new Error('SELECT secret FROM tasks');
    };
    const res = await ctx.call('GET', '/tasks');
    expect(res.statusCode).toBe(500);
    const { error } = res.json();
    expect(error).toEqual({
      code: 'INTERNAL',
      message: 'Внутрішня помилка сервера',
      requestId: res.headers['x-request-id'],
    });
    expect(ctx.logs.some((l) => l.level === 50 && l.requestId === error.requestId)).toBe(true);
  });

  test('невідомий маршрут → 404 NOT_FOUND', async () => {
    ctx = setup();
    const res = await ctx.call('GET', '/nope');
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });
});
