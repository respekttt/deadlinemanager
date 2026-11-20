// Composition root (spec §2): ресурси, сервіс, контекст запиту, глобальний обробник помилок.
import { randomUUID } from 'node:crypto';
import Fastify, { LogController } from 'fastify';
import { als, setRootLogger } from './context.js';
import { openDb } from './db/index.js';
import { createMemoryRepos } from './repositories/memory/index.js';
import healthRoutes from './routes/health.js';
import taskRoutes from './routes/tasks.js';
import versionRoutes from './routes/version.js';
import { EventBus } from './services/events.js';
import { registerHistoryRecorder } from './services/history-recorder.js';
import { defaultStrategies } from './services/strategies/index.js';
import { TaskService } from './services/task-service.js';

const STATUS_BY_CODE = {
  VALIDATION_ERROR: 400,
  INVALID_TRANSITION: 400,
  NOT_FOUND: 404,
  IDEMPOTENCY_CONFLICT: 409,
  SOURCE_UNAVAILABLE: 503,
};

// Єдине місце, де помилки перетворюються на HTTP (spec §5, «Помилки»).
export function toHttpError(err) {
  if (
    err.validation ||
    err.code === 'FST_ERR_CTP_INVALID_JSON_BODY' ||
    err.code === 'FST_ERR_CTP_EMPTY_JSON_BODY'
  ) {
    return { status: 400, code: 'VALIDATION_ERROR', message: err.message };
  }
  const status = STATUS_BY_CODE[err.code];
  if (status) return { status, code: err.code, message: err.message };
  if (err.statusCode >= 400 && err.statusCode < 500) {
    return { status: err.statusCode, code: 'VALIDATION_ERROR', message: err.message };
  }
  return { status: 500, code: 'INTERNAL', message: 'Внутрішня помилка сервера' };
}

export function buildApp({
  repos = createMemoryRepos(),
  db,
  version = 'unknown',
  now = () => new Date(),
  strategies = defaultStrategies(),
  logger = { level: process.env.LOG_LEVEL ?? 'info' },
} = {}) {
  const app = Fastify({
    logger,
    requestIdHeader: 'x-request-id',
    logController: new LogController({ requestIdLogLabel: 'requestId' }),
    genReqId: () => randomUUID(),
  });
  setRootLogger(app.log);

  const events = new EventBus();
  registerHistoryRecorder(events);
  const service = new TaskService({ repos, events, strategies, now });

  // Контекст запиту для всіх шарів (ADR 0010).
  app.addHook('onRequest', (req, reply, done) => {
    const userId = req.headers['x-user-id'] || 'anonymous';
    reply.header('x-request-id', req.id);
    als.run({ requestId: req.id, userId, log: req.log.child({ userId }) }, done);
  });

  app.setErrorHandler((err, req, reply) => {
    const { status, code, message } = toHttpError(err);
    if (status >= 500) req.log.error({ err, code }, 'request failed');
    else req.log.warn({ code, message }, 'request rejected');
    return reply.code(status).send({ error: { code, message, requestId: req.id } });
  });

  app.setNotFoundHandler((req, reply) =>
    reply
      .code(404)
      .send({ error: { code: 'NOT_FOUND', message: 'Маршрут не знайдено', requestId: req.id } }),
  );

  if (db) app.addHook('onClose', async () => db.close());
  app.register(healthRoutes);
  app.register(versionRoutes, { version });
  app.register(taskRoutes, { service });
  return app;
}

// Sha коміту: GIT_SHA (CI/деплой) або `git rev-parse` у робочій копії.
export function gitSha() {
  if (process.env.GIT_SHA) return process.env.GIT_SHA;
  try {
    const { stdout, success } = Bun.spawnSync(['git', 'rev-parse', '--short', 'HEAD']);
    return success ? stdout.toString().trim() : 'unknown';
  } catch {
    return 'unknown';
  }
}

// Етап 1 (прототип): in-memory репозиторії; БД відкривається лише для перевірки схеми.
if (import.meta.main) {
  const db = openDb(process.env.DB_PATH ?? './data/deadlinehub.db');
  await buildApp({ db, version: gitSha() }).listen({ port: Number(process.env.PORT ?? 3000) });
}
