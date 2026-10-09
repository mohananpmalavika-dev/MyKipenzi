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
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=12')).rowCount) {
      await c.query(await readFile(new URL('./privacy-settings-migration.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(12)');
    }
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=13')).rowCount) {
      await c.query(await readFile(new URL('./scheduled-schema.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(13)');
    }
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=14')).rowCount) {
      await c.query(await readFile(new URL('./drafts-schema.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(14)');
    }
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=15')).rowCount) {
      await c.query(await readFile(new URL('./message-status-schema.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(15)');
    }
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=16')).rowCount) {
      await c.query(await readFile(new URL('./threads-schema.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(16)');
    }
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=17')).rowCount) {
      await c.query(await readFile(new URL('./relationship-story-schema.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(17)');
    }
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=18')).rowCount) {
      await c.query(await readFile(new URL('./view-once-schema.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(18)');
    }
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=19')).rowCount) {
      await c.query(await readFile(new URL('./calendar-schema.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(19)');
    }
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=20')).rowCount) {
      await c.query(await readFile(new URL('./time-capsule-schema.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(20)');
    }
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=21')).rowCount) {
      await c.query(await readFile(new URL('./mood-schema.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(21)');
    }
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=22')).rowCount) {
      await c.query(await readFile(new URL('./capture-alerts-schema.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(22)');
    }
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=23')).rowCount) {
      await c.query(await readFile(new URL('./romantic-surprises-schema.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(23)');
    }
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=24')).rowCount) {
      await c.query(await readFile(new URL('./forward-schema.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(24)');
    }
    if (!(await c.query('SELECT version FROM schema_migrations WHERE version=25')).rowCount) {
      await c.query(await readFile(new URL('./contacts-schema.sql', import.meta.url), 'utf8'));
      await c.query('INSERT INTO schema_migrations(version) VALUES(25)');
    }
  });
  console.log('Database migrations complete.');
} finally {
  await db.end();
}
