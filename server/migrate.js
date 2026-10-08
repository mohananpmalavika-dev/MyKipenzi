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
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=2')).rowCount) {
      await c.query(await readFile(new URL('./push-schema.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(2)');
    }
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=3')).rowCount) {
      await c.query(await readFile(new URL('./message-actions-schema.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(3)');
    }
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=4')).rowCount) {
      await c.query(await readFile(new URL('./reactions-schema.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(4)');
    }
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=5')).rowCount) {
      await c.query(await readFile(new URL('./safety-schema.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(5)');
    }
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=6')).rowCount) {
      await c.query(await readFile(new URL('./group-schema.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(6)');
    }
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=7')).rowCount) {
      await c.query(await readFile(new URL('./group-features-migration.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(7)');
    }
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=8')).rowCount) {
      await c.query(await readFile(new URL('./saved-messages-schema.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(8)');
    }
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=9')).rowCount) {
      await c.query(await readFile(new URL('./daily-prompt-schema.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(9)');
    }
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=10')).rowCount) {
      await c.query(await readFile(new URL('./disappearing-schema.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(10)');
    }
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=11')).rowCount) {
      await c.query(await readFile(new URL('./disappearing-hour-schema.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(11)');
    }
  });
  console.log('Database migrations complete.');
} finally {
  await db.end();
}
