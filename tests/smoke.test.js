import { test, expect } from 'bun:test';
import { openDb } from '../server/db/index.js';
import { buildApp } from '../server/main.js';

test('smoke: сервер на порожній БД, GET /health → 200', async () => {
  const app = buildApp({ db: openDb(':memory:') });
  const res = await app.inject({ method: 'GET', url: '/health' });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toEqual({ status: 'ok' });
  await app.close();
});
