import { z } from 'zod';
import { languages, stickers, stickerCategories } from './constants.js';
export { languages, stickers, stickerCategories };
export const id = z.string().uuid();
export const language = z.enum(['en', 'ml', 'manglish', 'sw']);
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
});
export const messageInput = z
  .object({
    client_id: id,
    text: z.string().trim().max(5000).default(''),
    source_language: z.enum(['auto', 'en', 'ml', 'manglish', 'sw']).default('auto'),
    sticker: z.enum(Object.keys(stickers)).optional(),
    attachment_id: id.optional(),
  })
  .refine((v) => v.text || v.sticker || v.attachment_id, { message: 'Message is empty' });
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
