import Redis from 'ioredis';
import { Queue } from 'bullmq';
import pino from 'pino';
import { config } from './config.js';
import { HttpError } from './security.js';
export const logger = pino({
  redact: ['req.headers.cookie', 'req.headers.authorization', 'password', 'token', 'csrf'],
});
export const redis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: 2 });
redis.on('error', (error) => logger.error({ error: error.message }, 'Redis error'));
export const queueConnection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
queueConnection.on('error', (error) => logger.error({ error: error.message }, 'Queue Redis error'));
export const queue = new Queue('kipenzi-ai', {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 1000,
    removeOnFail: 1000,
  },
});
export async function limit(key, max, seconds) {
  const count = await redis.eval(
    "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
    1,
    `${config.RATE_LIMIT_NAMESPACE}:limit:${key}`,
    seconds,
  );
  if (count > max) throw new HttpError(429, 'Too many requests. Please try again later.');
}
export async function aiLimit(userId) {
  const day = new Date().toISOString().slice(0, 10);
  await limit(`ai:${day}:${userId}`, config.AI_DAILY_LIMIT, 86400);
  await limit(`ai:global:${day}`, config.AI_GLOBAL_DAILY_LIMIT, 86400);
}
