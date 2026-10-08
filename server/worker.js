import { Worker } from 'bullmq';
import { config } from './config.js';
import { one, db, transaction } from './db.js';
import { queueConnection, redis, queue, logger, limit } from './infra.js';
import {
  translateText,
  translateAudio,
  speech,
  createAvatar,
  getAvatar,
  avatarVideo,
  deleteVoice,
} from './providers.js';
import { putObject, providerObject, readObject } from './storage.js';
import { enqueue, conversationEvent } from './service.js';
import { deliverMessagePush } from './push.js';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function translation(data) {
  const { message_id, language, requester_id, requester_ids } = data;
  const m = await one(
    'SELECT m.*,u.ai_consent,t.status,a.object_key,a.mime,a.name FROM messages m JOIN users u ON u.id=m.sender_id JOIN translations t ON t.message_id=m.id AND t.language=$2 LEFT JOIN attachments a ON a.id=m.attachment_id WHERE m.id=$1',
    [message_id, language],
  );
  if (!m || m.deleted_at || m.status === 'ready') return;
  if (!m.ai_consent) throw new Error('AI processing consent was withdrawn.');
  const requesters = requester_ids || (requester_id ? [requester_id] : []);
  if (requesters.length) {
    const requester = await one('SELECT 1 FROM users u JOIN members mm ON mm.user_id=u.id WHERE u.id=ANY($1::uuid[]) AND u.ai_consent AND mm.conversation_id=$2 LIMIT 1', [requesters, m.conversation_id]);
    if (!requester)
      throw new Error('Translation recipient withdrew AI processing consent.');
  }
  // Translation is capped separately because one sender can trigger one job per language.
  const day = new Date().toISOString().slice(0, 10);
  await limit(`translation:${day}:${m.sender_id}`, 200, 86400);
  await limit(`translation:global:${day}`, config.AI_GLOBAL_DAILY_LIMIT * 5, 86400);

  const isVoice =
    m.attachment_id &&
    (m.mime?.startsWith('audio/') ||
      (/^voice-note-/.test(m.name || '') && m.mime === 'video/webm'));

  if (isVoice && (!m.text || m.text.trim() === '')) {
    const audioBytes = await readObject(m.object_key);
    const results = await translateAudio(Buffer.from(audioBytes), m.mime, m.name);
    await transaction(async (c) => {
      const current = await one(
        'SELECT edited_at,deleted_at FROM messages WHERE id=$1 FOR UPDATE',
        [message_id],
        c,
      );
      if (!current || current.deleted_at || String(current.edited_at) !== String(m.edited_at))
        return;
      for (const [lang, transText] of Object.entries(results)) {
        if (['ml', 'manglish', 'sw', 'en'].includes(lang) && transText) {
          await c.query(
            "INSERT INTO translations(message_id,language,status,text) VALUES($1,$2,'ready',$3) ON CONFLICT(message_id,language) DO UPDATE SET text=EXCLUDED.text,status='ready'",
            [message_id, lang, transText],
          );
        }
      }
      await conversationEvent(c, m.conversation_id, 'message:changed', {
        conversation_id: m.conversation_id,
        message_id,
      });
    });
    return;
  }

  const text =
    m.source_language === language
      ? m.text
      : await translateText(m.text, m.source_language, language);
  await transaction(async (c) => {
    const current = await one('SELECT text,edited_at,deleted_at FROM messages WHERE id=$1 FOR UPDATE', [message_id], c);
    if (!current || current.deleted_at || current.text !== m.text || String(current.edited_at) !== String(m.edited_at)) return;
    await c.query(
      "UPDATE translations SET text=$3,status='ready' WHERE message_id=$1 AND language=$2",
      [message_id, language, text],
    );
    await conversationEvent(c, m.conversation_id, 'message:changed', {
      conversation_id: m.conversation_id,
      message_id,
    });
  });
}
async function media(data) {
  const job = await one('SELECT * FROM media_jobs WHERE id=$1', [data.job_id]);
  if (!job || job.status === 'ready') return;
  const user = await one('SELECT * FROM users WHERE id=$1', [job.user_id]);
  const m = await one(
    'SELECT m.*,u.ai_consent FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=$1',
    [job.message_id],
  );
  if (!m || m.deleted_at) return;
  if (!user.ai_consent || !m.ai_consent) throw new Error('AI processing consent was withdrawn.');
  if (job.own_voice && (!user.voice_id || !user.voice_verified || !user.likeness_consent))
    throw new Error('Your own voice is unavailable.');
  if (job.kind === 'avatar' && (!user.avatar_id || !user.likeness_consent))
    throw new Error('Photo animation consent is required.');
  let target = user.language === 'manglish' ? 'ml' : user.language;
  const cached = await one(
    "SELECT text FROM translations WHERE message_id=$1 AND language=$2 AND status='ready'",
    [m.id, target],
  );
  const text =
    cached?.text ||
    (m.source_language === target
      ? m.text
      : await translateText(m.text, m.source_language, target));
  const audioKey = `generated/${user.id}/${job.id}.mp3`;
  if (!job.provider_id) {
    const audio = await speech(
      text,
      target,
      job.own_voice ? user.voice_id : config.ELEVENLABS_VOICE_ID,
    );
    await putObject(audioKey, audio, 'audio/mpeg');
  }
  let key = audioKey,
    mime = 'audio/mpeg';
  if (job.kind === 'avatar') {
    if (config.DID_API_KEY) {
      let providerId = job.provider_id;
      if (!providerId) {
        const current = await one('SELECT * FROM users WHERE id=$1', [user.id]);
        if (!current.ai_consent || !current.likeness_consent)
          throw new Error('Consent was withdrawn.');
        const photo = await one('SELECT object_key FROM attachments WHERE id=$1', [
          current.avatar_id,
        ]);
        const result = await createAvatar(
          await providerObject(photo.object_key),
          await providerObject(audioKey),
        );
        providerId = result.id;
        if (!providerId) throw new Error('Avatar provider returned no job.');
        await db.query('UPDATE media_jobs SET provider_id=$2 WHERE id=$1', [job.id, providerId]);
      }
      let result;
      for (let attempt = 0; attempt < 40; attempt++) {
        result = await getAvatar(providerId);
        if (result.status === 'done' || result.status === 'error' || result.status === 'rejected')
          break;
        await sleep(3000);
      }
      if (result?.status !== 'done' || !result.result_url)
        throw new Error('Talking photo is not ready. Retry later.');
      key = `generated/${user.id}/${job.id}.mp4`;
      mime = 'video/mp4';
      await putObject(key, await avatarVideo(result.result_url), mime);
    } else {
      // Free Audio-Reactive Talking Avatar:
      // High-fidelity speech audio is already saved in audioKey.
      key = audioKey;
      mime = 'audio/mpeg';
    }
  }
  await transaction(async (c) => {
    await c.query(
      "UPDATE media_jobs SET status='ready',object_key=$2,mime=$3,error=NULL WHERE id=$1",
      [job.id, key, mime],
    );
    await enqueue(c, 'event', { users: [user.id], event: 'media:changed', data: { id: job.id } });
  });
}
const worker = new Worker(
  'kipenzi-ai',
  async (job) => {
    if (job.name === 'translate') await translation(job.data);
    else if (job.name === 'media') await media(job.data);
    else if (job.name === 'delete_voice') await deleteVoice(job.data.voice_id);
    else if (job.name === 'push') await deliverMessagePush(job.data, job.attemptsMade);
  },
  { connection: queueConnection, concurrency: 3 },
);
worker.on('error', (e) => logger.error({ error: e.message }, 'Worker error'));
worker.on('failed', async (job, error) => {
  logger.warn({ job_id: job?.id, error: error.message }, 'AI job failed');
  if (!job || job.attemptsMade < (job.opts.attempts || 1)) return;
  try {
    await transaction(async (c) => {
      if (job.name === 'translate') {
        await c.query(
          "UPDATE translations SET status='failed' WHERE message_id=$1 AND language=$2 AND status<>'ready'",
          [job.data.message_id, job.data.language],
        );
        const m = await one(
          'SELECT conversation_id FROM messages WHERE id=$1',
          [job.data.message_id],
          c,
        );
        if (m)
          await conversationEvent(c, m.conversation_id, 'message:changed', {
            conversation_id: m.conversation_id,
            message_id: job.data.message_id,
          });
      }
      if (job.name === 'media') {
        await c.query(
          "UPDATE media_jobs SET status='failed',error='Generation failed. Check your consent settings or try again later.' WHERE id=$1 AND status<>'ready'",
          [job.data.job_id],
        );
        const media = await one('SELECT user_id FROM media_jobs WHERE id=$1', [job.data.job_id], c);
        if (media)
          await enqueue(c, 'event', {
            users: [media.user_id],
            event: 'media:changed',
            data: { id: job.data.job_id },
          });
      }
    });
  } catch (e) {
    logger.error({ error: e.message }, 'Failed-job status update failed');
  }
});
logger.info('AI worker listening');
async function shutdown() {
  await worker.close();
  await queue.close();
  await Promise.all([queueConnection.quit(), redis.quit(), db.end()]);
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
