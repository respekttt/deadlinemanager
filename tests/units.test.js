import { expect, test } from 'bun:test';
import { als, getContext, log, setRootLogger } from '../server/context.js';
import { STATUSES } from '../server/domain/schemas.js';
import { stateOf } from '../server/domain/states.js';
import { EventBus } from '../server/services/events.js';
import { buildApp, toHttpError } from '../server/main.js';
import { setup } from './helpers.js';

test('State: дозволені лише переходи з README', () => {
  const allowed = STATUSES.flatMap((from) =>
    STATUSES.filter((to) => stateOf(from).canTransitionTo(to)).map((to) => `${from}→${to}`),
  );
  expect(allowed).toEqual(['todo→in_progress', 'in_progress→todo', 'in_progress→done']);
});

test('context: поза запитом log пише в кореневий логер, у запиті — у логер контексту', () => {
  const lines = [];
  const spy = (tag) =>
    Object.fromEntries(
      ['debug', 'info', 'warn', 'error'].map((l) => [l, (m) => lines.push([tag, l, m])]),
    );
  setRootLogger(spy('root'));
  expect(getContext()).toBeUndefined();
  log.warn('a');
  als.run({ requestId: 'r', userId: 'u', log: spy('req') }, () => {
    log.error('b');
    log.debug('c');
    log.info('d');
  });
  expect(lines).toEqual([
    ['root', 'warn', 'a'],
    ['req', 'error', 'b'],
    ['req', 'debug', 'c'],
    ['req', 'info', 'd'],
  ]);
});

test('EventBus: кілька підписників за порядком; подія без підписників — no-op', () => {
  const bus = new EventBus();
  const seen = [];
  bus.subscribe('x', (e, d) => seen.push(['first', e.n, d]));
  bus.subscribe('x', (e) => seen.push(['second', e.n]));
  bus.publish({ type: 'x', n: 1 }, 'deps');
  bus.publish({ type: 'none' });
  expect(seen).toEqual([
    ['first', 1, 'deps'],
    ['second', 1],
  ]);
});

test('toHttpError: доменні коди, помилки Fastify 4xx і решта → 500', () => {
  expect(toHttpError({ code: 'SOURCE_UNAVAILABLE', message: 'm' })).toEqual({
    status: 503,
    code: 'SOURCE_UNAVAILABLE',
    message: 'm',
  });
  expect(toHttpError({ statusCode: 415, message: 'bad type' }).status).toBe(415);
  expect(toHttpError(new Error('boom'))).toEqual({
    status: 500,
    code: 'INTERNAL',
    message: 'Внутрішня помилка сервера',
  });
});

test('непідтримуваний Content-Type → 415 через глобальний обробник', async () => {
  const { app } = setup();
  const res = await app.inject({
    method: 'POST',
    url: '/tasks',
    payload: 'x',
    headers: { 'content-type': 'application/xml' },
  });
  expect(res.statusCode).toBe(415);
  expect(res.json().error.requestId).toBe(res.headers['x-request-id']);
  await app.close();
});

test('buildApp за замовчуванням: in-memory репозиторії й системний годинник', async () => {
  const app = buildApp({ logger: false });
  const res = await app.inject({
    method: 'POST',
    url: '/tasks',
    payload: { title: 'Диплом', dueAt: '2099-01-01T00:00:00.000Z' },
  });
  expect(res.statusCode).toBe(201);
  expect(Date.parse(res.json().createdAt)).toBeLessThanOrEqual(Date.now());
  await app.close();
});
