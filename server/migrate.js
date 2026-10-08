import { readFile } from 'node:fs/promises';
import { db, transaction } from './db.js';
try {
  await transaction(async (c) => {
    await c.query('SELECT pg_advisory_xact_lock(73481209)');
    await c.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY, applied_at timestamptz DEFAULT now())',
    );
    const existing = await c.query('SELECT version FROM schema_migrations WHERE version=1');
    if (!existing.rowCount) {
      await c.query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(1)');
    }
  });
  console.log('Database migrations complete.');
} finally {
  await db.end();
}
