import Fastify from 'fastify';
import healthRoutes from './routes/health.js';

export function buildApp() {
  const app = Fastify();
  app.register(healthRoutes);
  return app;
}

if (import.meta.main) {
  await buildApp().listen({ port: Number(process.env.PORT ?? 3000) });
}
