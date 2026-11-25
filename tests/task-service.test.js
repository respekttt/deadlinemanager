import { expect, test } from 'bun:test';
import { als } from '../server/context.js';
import { SourceUnavailableError } from '../server/domain/errors.js';
import { createMemoryRepos } from '../server/repositories/memory/index.js';
import { CreateTaskCommand } from '../server/services/commands/create-task.js';
import { EventBus } from '../server/services/events.js';
import { registerHistoryRecorder } from '../server/services/history-recorder.js';
import { defaultStrategies } from '../server/services/strategies/index.js';
import { TaskService } from '../server/services/task-service.js';
import { FUTURE, NOW, task } from './helpers.js';

const service = (strategies = defaultStrategies(), tasks = []) => {
  const events = new EventBus();
  registerHistoryRecorder(events);
  return new TaskService({
    repos: createMemoryRepos({ tasks }),
    events,
    strategies,
    now: () => NOW,
  });
};

test('AC-14: нова стратегія з реєстру застосовується без зміни TaskService', () => {
  const TitleContains = {
    apply: (tasks, { value }) => tasks.filter((t) => t.title.includes(value)),
  };
  const svc = service({ ...defaultStrategies(), q: TitleContains }, [
    task({ id: 1, title: 'Лабораторна 3' }),
    task({ id: 2, title: 'Курсова' }),
  ]);
  expect(svc.list({ q: 'Курс', sort: 'dueAt' }).map((t) => t.id)).toEqual([2]);
});

test('сервіс поза запитом: ініціатор anonymous, логер без контексту не падає', () => {
  const svc = service();
  const created = svc.run(new CreateTaskCommand({ title: 'Есе', dueAt: FUTURE }));
  expect(svc.history(created.id)[0].changedBy).toBe('anonymous');
});

test('сервіс у контексті: ініціатор з AsyncLocalStorage', () => {
  const svc = service();
  const noop = () => {};
  const log = { debug: noop, info: noop, warn: noop, error: noop };
  const created = als.run({ requestId: 'r1', userId: 'u1', log }, () =>
    svc.run(new CreateTaskCommand({ title: 'Есе', dueAt: FUTURE })),
  );
  expect(svc.history(created.id)[0].changedBy).toBe('u1');
});

test('SourceUnavailableError має код SOURCE_UNAVAILABLE і зберігає причину', () => {
  const cause = new Error('SQLITE_BUSY');
  const err = new SourceUnavailableError(cause);
  expect(err.code).toBe('SOURCE_UNAVAILABLE');
  expect(err.cause).toBe(cause);
});
