import { test, expect } from 'bun:test';
import { buildApp } from '../server/main.js';

test('smoke: GET /health → 200', async () => {
  const app = buildApp();
  const res = await app.inject({ method: 'GET', url: '/health' });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toEqual({ status: 'ok' });
  await app.close();
});
