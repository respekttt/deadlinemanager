import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const schema = await Bun.file(new URL('./schema.sql', import.meta.url)).text();
const seed = await Bun.file(new URL('./seed.sql', import.meta.url)).text();

export function openDb(path = ':memory:') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path, { strict: true });
  db.run('PRAGMA foreign_keys = ON');
  db.run(schema);
  db.run(seed);
  return db;
}
