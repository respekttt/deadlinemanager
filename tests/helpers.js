import { buildApp } from '../server/main.js';
import { createMemoryRepos } from '../server/repositories/memory/index.js';

export const NOW = new Date('2026-11-20T12:00:00.000Z');
export const FUTURE = '2026-12-01T21:00:00.000Z';

// Застосунок на in-memory репозиторіях із фіксованим часом; logs — розібрані рядки логу (level debug).
export function setup({ tasks, now = NOW, ...opts } = {}) {
  const repos = createMemoryRepos({ tasks });
  const logs = [];
  const clock = { now };
  const logger = { level: 'debug', stream: { write: (line) => logs.push(JSON.parse(line)) } };
  const app = buildApp({ repos, now: () => clock.now, logger, ...opts });
  const call = (method, url, payload, headers) => app.inject({ method, url, payload, headers });
  return { app, repos, logs, clock, call };
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
