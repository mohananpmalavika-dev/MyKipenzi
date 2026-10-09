import { z } from 'zod';
import { languages, stickers, stickerCategories } from './constants.js';
export { languages, stickers, stickerCategories };
export const id = z.string().uuid();
export const language = z.enum(['en', 'ml', 'manglish', 'sw']);
export const targetLanguage = z.enum(['en', 'ml', 'manglish', 'sw', 'transcript']);
export const registration = z
  .object({
    username: z.string().regex(/^[a-zA-Z0-9_]{3,30}$/).optional(),
    handle: z.string().regex(/^[a-zA-Z0-9_]{3,30}$/).optional(),
    name: z.string().trim().min(1).max(80).optional(),
    email: z
      .string()
      .trim()
      .max(254)
      .optional()
      .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
        message: 'Invalid email address',
      }),
    password: z.string().min(12).max(128),
    language: language.default('en'),
    ai_consent: z.boolean().default(false),
  })
  .refine((v) => Boolean(v.handle || v.username), {
    message: 'Username is required',
  })
  .transform((v) => {
    const rawHandle = (v.username || v.handle || '').toLowerCase();
    const handle = rawHandle;
    const name = v.name || v.username || v.handle || rawHandle;
    const email = v.email ? v.email.toLowerCase() : `${rawHandle}@kipenzi.local`;
    return {
      handle,
      name,
      email,
      password: v.password,
      language: v.language || 'en',
      ai_consent: Boolean(v.ai_consent),
    };
  });
export const login = z
  .object({
    email: z.string().max(254).optional(),
    username: z.string().max(254).optional(),
    account: z.string().max(254).optional(),
    password: z.string().max(128),
  })
  .refine((v) => Boolean((v.account && v.account.trim()) || (v.username && v.username.trim()) || (v.email && v.email.trim())), {
    message: 'Username or email is required',
  })
  .transform((v) => {
    const raw = (v.account || v.username || v.email || '').trim().toLowerCase();
    return {
      account: raw,
      email: raw,
      password: v.password,
    };
  });
export const profile = z.object({
  name: z.string().trim().min(1).max(80),
  language,
  ai_consent: z.boolean(),
  likeness_consent: z.boolean(),
  online_status_visibility: z.enum(['everyone', 'contacts', 'nobody']).optional(),
  last_seen_visibility: z.enum(['everyone', 'contacts', 'nobody']).optional(),
});
export const messageInput = z
  .object({
    client_id: id,
    text: z.string().trim().max(5000).default(''),
    source_language: z.enum(['auto', 'en', 'ml', 'manglish', 'sw']).default('auto'),
    sticker: z.enum(Object.keys(stickers)).optional(),
    attachment_id: id.optional(),
    view_once: z.boolean().default(false),
    reply_to_id: id.optional(),
    expires_in_seconds: z.union([z.literal(0), z.literal(300), z.literal(3600), z.literal(86400), z.literal(604800), z.literal(2592000)]).optional(),
  })
  .refine((v) => v.text || v.sticker || v.attachment_id, { message: 'Message is empty' })
  .refine((v) => !v.view_once || (v.attachment_id && !v.text && !v.sticker), { message: 'View-once messages require a photo or video without a caption or sticker.' });
export const messageEdit = z.object({ text: z.string().trim().min(1).max(5000) });
export const reactionEmojis = ['❤️','😂','👍','😮','😢','🙏'];
export const reactionInput = z.object({ emoji: z.enum(reactionEmojis) });
export const signalInput = z
  .object({ call_id: id, type: z.enum(['offer', 'answer', 'ice']), data: z.unknown() })
  .superRefine((v, ctx) => {
    const schema =
      v.type === 'ice'
        ? z.object({
            candidate: z.string().max(2000),
            sdpMid: z.string().max(80).nullable().optional(),
            sdpMLineIndex: z.number().int().min(0).max(20).nullable().optional(),
            usernameFragment: z.string().max(256).nullable().optional(),
          })
        : z.object({ type: z.literal(v.type), sdp: z.string().max(100000) });
    if (!schema.safeParse(v.data).success)
      ctx.addIssue({ code: 'custom', message: 'Invalid signalling payload' });
  });
