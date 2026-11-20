// JSON Schema для Ajv у Fastify (ADR 0009). Правила, які схема не виражає, — у domain/task.js.
export const STATUSES = ['todo', 'in_progress', 'done'];

const id = { type: 'integer', minimum: 1 };

export const idParams = {
  type: 'object',
  required: ['id'],
  properties: { id },
};

export const createTaskBody = {
  type: 'object',
  required: ['title', 'dueAt'],
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    dueAt: { type: 'string', format: 'date-time' },
    courseId: { anyOf: [id, { type: 'null' }] },
  },
};

export const createTaskHeaders = {
  type: 'object',
  properties: {
    'idempotency-key': { type: 'string', minLength: 1, maxLength: 64 },
  },
};

export const changeStatusBody = {
  type: 'object',
  required: ['status'],
  additionalProperties: false,
  properties: { status: { type: 'string', enum: STATUSES } },
};

export const listQuery = {
  type: 'object',
  additionalProperties: false,
  properties: {
    status: { type: 'string', enum: STATUSES },
    courseId: id,
    overdue: { type: 'boolean' },
    sort: { type: 'string', enum: ['dueAt'], default: 'dueAt' },
  },
};
