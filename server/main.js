import Fastify from 'fastify';
import { openDb } from './db/index.js';
import healthRoutes from './routes/health.js';

export function buildApp({ db }) {
  const app = Fastify();
  app.addHook('onClose', async () => db.close());
  app.register(healthRoutes);
  return app;
}

if (import.meta.main) {
  const db = openDb(process.env.DB_PATH ?? './data/deadlinehub.db');
  await buildApp({ db }).listen({ port: Number(process.env.PORT ?? 3000) });
}
