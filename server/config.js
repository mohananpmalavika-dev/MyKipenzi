import 'dotenv/config';
import { z } from 'zod';
const bool = z.enum(['true', 'false']).transform((v) => v === 'true');
export const config = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().default(3001),
    APP_ORIGIN: z.string().url(),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    ALLOW_REGISTRATION: bool.default(false),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    S3_ENDPOINT: z.string().url().optional(),
    S3_PUBLIC_ENDPOINT: z.string().url().optional(),
    S3_REGION: z.string().default('us-east-1'),
    S3_BUCKET: z.string().min(1),
    S3_ACCESS_KEY: z.string().min(1),
    S3_SECRET_KEY: z.string().min(1),
    CLAMAV_HOST: z.string().default('localhost'),
    CLAMAV_PORT: z.coerce.number().default(3310),
    SKIP_VIRUS_SCAN: bool.default(false),
    GEMINI_API_KEY: z.string().default(''),
    GEMINI_MODEL: z.string().default('gemini-3.1-flash-lite'),
    ELEVENLABS_API_KEY: z.string().default(''),
    ELEVENLABS_MODEL: z.string().default('eleven_v3'),
    ELEVENLABS_VOICE_ID: z.string().default(''),
    DID_API_KEY: z.string().default(''),
    VAPID_PUBLIC_KEY: z.string().default(''),
    VAPID_PRIVATE_KEY: z.string().default(''),
    TURN_URL: z.string().default(''),
    TURN_SECRET: z.string().default(''),
    AI_DAILY_LIMIT: z.coerce.number().int().positive().default(30),
    AI_GLOBAL_DAILY_LIMIT: z.coerce.number().int().positive().default(1000),
    RATE_LIMIT_NAMESPACE: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{1,80}$/)
      .default('kipenzi'),
  })
  .parse(process.env);
export const production = config.NODE_ENV === 'production';
if (
  production &&
  (config.SKIP_VIRUS_SCAN ||
    !config.APP_ORIGIN.startsWith('https://') ||
    config.TURN_SECRET.length < 32 ||
    config.TURN_SECRET.startsWith('replace_') ||
    !config.TURN_URL)
)
  throw new Error('Production requires HTTPS, virus scanning, and unique TURN credentials.');
