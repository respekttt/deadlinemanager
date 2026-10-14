// C3: межі модулів — машинно перевірювана копія spec §2 (standards/spec.md)
const SQLITE = '^bun:sqlite$';
const FASTIFY = '^fastify$';

module.exports = {
  forbidden: [
    {
      name: 'domain-isolated',
      comment: 'domain не залежить від server/, fastify, bun:sqlite',
      severity: 'error',
      from: { path: '^server/domain/' },
      to: { path: ['^server/(?!domain/)', FASTIFY, SQLITE] },
    },
    {
      name: 'services-no-infra',
      comment: 'services не залежить від repositories, db, routes, fastify, bun:sqlite',
      severity: 'error',
      from: { path: '^server/services/' },
      to: { path: ['^server/(repositories|db|routes)/', FASTIFY, SQLITE] },
    },
    {
      name: 'routes-no-storage',
      comment: 'routes не залежить від repositories і db',
      severity: 'error',
      from: { path: '^server/routes/' },
      to: { path: ['^server/(repositories|db)/', SQLITE] },
    },
    {
      name: 'routes-domain-only-errors-schemas',
      comment: 'routes бере з domain лише errors.js і schemas.js',
      severity: 'error',
      from: { path: '^server/routes/' },
      to: { path: '^server/domain/', pathNot: '^server/domain/(errors|schemas)\\.js$' },
    },
    {
      name: 'sqlite-only-in-db-and-repositories',
      comment: 'bun:sqlite імпортують лише server/db і server/repositories',
      severity: 'error',
      from: { pathNot: '^server/(db|repositories)/' },
      to: { path: SQLITE },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '^(node_modules|coverage|data)/' },
  },
};
