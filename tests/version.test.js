import { test, expect } from 'bun:test';
import { openDb } from '../server/db/index.js';
import { buildApp, gitSha } from '../server/main.js';

test('AC-16: GET /version → 200 { version } із sha, переданим у buildApp', async () => {
  const app = buildApp({ db: openDb(':memory:'), version: 'abc1234' });
  const res = await app.inject({ method: 'GET', url: '/version' });
  expect(res.statusCode).toBe(200);
  expect(res.json()).toEqual({ version: 'abc1234' });
  await app.close();
});

test('gitSha: GIT_SHA має пріоритет, інакше — короткий sha з git', () => {
  const saved = process.env.GIT_SHA;
  try {
    process.env.GIT_SHA = 'deadbee';
    expect(gitSha()).toBe('deadbee');
    delete process.env.GIT_SHA;
    expect(gitSha()).toMatch(/^[0-9a-f]{7,}$/);
  } finally {
    if (saved === undefined) delete process.env.GIT_SHA;
    else process.env.GIT_SHA = saved;
  }
});
