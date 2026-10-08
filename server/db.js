import pg from 'pg';
import { config } from './config.js';
export const db = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 15,
  connectionTimeoutMillis: 10000,
  statement_timeout: 15000,
});
db.on('error', (error) => console.error('Database connection error:', error.message));
export async function transaction(fn) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
export async function one(sql, params = [], client = db) {
  return (await client.query(sql, params)).rows[0];
}
