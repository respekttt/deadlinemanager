import Fastify from 'fastify';
import { openDb } from './db/index.js';
import healthRoutes from './routes/health.js';
import versionRoutes from './routes/version.js';

export function buildApp({ db, version = 'unknown' }) {
  const app = Fastify();
  app.addHook('onClose', async () => db.close());
  app.register(healthRoutes);
  app.register(versionRoutes, { version });
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

if (import.meta.main) {
  const db = openDb(process.env.DB_PATH ?? './data/deadlinehub.db');
  await buildApp({ db, version: gitSha() }).listen({ port: Number(process.env.PORT ?? 3000) });
}
