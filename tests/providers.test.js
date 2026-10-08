import test from 'node:test';
import assert from 'node:assert/strict';
process.env.APP_ORIGIN ||= 'http://localhost:5173';
process.env.DATABASE_URL ||= 'postgres://unused';
process.env.REDIS_URL ||= 'redis://unused';
process.env.S3_BUCKET ||= 'unused';
process.env.S3_ACCESS_KEY ||= 'unused';
process.env.S3_SECRET_KEY ||= 'unused';
process.env.GEMINI_API_KEY = 'test';
const { translateText, avatarVideo, voiceVerified } = await import('../server/providers.js');
test('translation handles Manglish as a language and preserves user text as data', async () => {
  const original = globalThis.fetch;
  let body;
  globalThis.fetch = async (_url, options) => {
    body = JSON.parse(options.body);
    return new Response(
      JSON.stringify({
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'Habari yako?' }] } }],
      }),
      { status: 200 },
    );
  };
  try {
    assert.equal(await translateText('sughamano?', 'manglish', 'sw'), 'Habari yako?');
    assert.equal(body.contents[0].parts[0].text, 'sughamano?');
    assert.match(body.systemInstruction.parts[0].text, /romanized Malayalam/);
    assert.match(body.systemInstruction.parts[0].text, /Kiswahili/);
  } finally {
    globalThis.fetch = original;
  }
});
test('blocked or truncated translation is never presented as a successful translation', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'partial' }] } }],
      }),
    );
  try {
    await assert.rejects(() => translateText('text', 'en', 'ml'), /could not be completed/);
  } finally {
    globalThis.fetch = original;
  }
});
test('avatar downloads cannot fetch arbitrary URLs', async () => {
  await assert.rejects(() => avatarVideo('http://127.0.0.1/private'), /Unexpected/);
  await assert.rejects(() => avatarVideo('https://evil.example/video.mp4'), /Unexpected/);
});
test('voice availability follows provider verification metadata and fails closed', async () => {
  const original = globalThis.fetch;
  try {
    for (const [metadata, expected] of [
      [{ voice_verification: { is_verified: true } }, true],
      [{ voice_verification: { requires_verification: false } }, true],
      [{ voice_verification: { requires_verification: true, is_verified: false } }, false],
      [{}, false],
    ]) {
      globalThis.fetch = async () => new Response(JSON.stringify(metadata));
      assert.equal(await voiceVerified('owned_voice'), expected);
    }
  } finally {
    globalThis.fetch = original;
  }
});
