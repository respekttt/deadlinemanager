// HTTP для задач (spec §3): лише розбір запиту й виклик сервісу; помилки — у setErrorHandler.
import {
  changeStatusBody,
  createTaskBody,
  createTaskHeaders,
  idParams,
  listQuery,
} from '../domain/schemas.js';
import { ChangeStatusCommand } from '../services/commands/change-status.js';
import { CreateTaskCommand } from '../services/commands/create-task.js';

export default async function taskRoutes(app, { service }) {
  app.post(
    '/tasks',
    { schema: { body: createTaskBody, headers: createTaskHeaders } },
    async (req, reply) => {
      const task = service.run(new CreateTaskCommand(req.body, req.headers['idempotency-key']));
      return reply.code(201).send(task);
    },
  );

  app.get('/tasks', { schema: { querystring: listQuery } }, async (req) => service.list(req.query));

  app.get('/tasks/:id', { schema: { params: idParams } }, async (req) =>
    service.get(req.params.id),
  );

  app.patch(
    '/tasks/:id/status',
    { schema: { params: idParams, body: changeStatusBody } },
    async (req) => service.run(new ChangeStatusCommand(req.params.id, req.body.status)),
  );

  app.get('/tasks/:id/history', { schema: { params: idParams } }, async (req) =>
    service.history(req.params.id),
  );
}
