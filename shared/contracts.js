import { z } from 'zod';
import { languages, stickers, stickerCategories } from './constants.js';
export { languages, stickers, stickerCategories };
export const id = z.string().uuid();
export const language = z.enum(['en', 'ml', 'manglish', 'sw']);
export const targetLanguage = z.enum(['en', 'ml', 'manglish', 'sw', 'transcript']);
export const registration = z.object({
  handle: z.string().regex(/^[a-z0-9_]{3,30}$/),
  name: z.string().trim().min(1).max(80),
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(12).max(128),
  language: language.default('en'),
  ai_consent: z.boolean().default(false),
});
export const login = z.object({
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().max(128),
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
    reply_to_id: id.optional(),
    expires_in_seconds: z.union([z.literal(0), z.literal(300), z.literal(3600), z.literal(86400), z.literal(604800), z.literal(2592000)]).optional(),
  })
  .refine((v) => v.text || v.sticker || v.attachment_id, { message: 'Message is empty' });
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
