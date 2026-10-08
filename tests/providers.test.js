import test from 'node:test';
import assert from 'node:assert/strict';
process.env.APP_ORIGIN ||= 'http://localhost:5173';
process.env.DATABASE_URL ||= 'postgres://unused';
process.env.REDIS_URL ||= 'redis://unused';
process.env.S3_BUCKET ||= 'unused';
process.env.S3_ACCESS_KEY ||= 'unused';
process.env.S3_SECRET_KEY ||= 'unused';
process.env.GEMINI_API_KEY = 'test';
const { translateText, translateAudio, avatarVideo, voiceVerified } = await import('../server/providers.js');
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
test('translateAudio transcribes voice note and translates to Malayalam, Manglish, and Swahili', async () => {
  const original = globalThis.fetch;
  let body;
  globalThis.fetch = async (_url, options) => {
    body = JSON.parse(options.body);
    return new Response(
      JSON.stringify({
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    transcript: 'Hello, how are you?',
                    ml: 'ഹലോ, സുഖമാണോ?',
                    manglish: 'Hello, sugamano?',
                    sw: 'Hujambo, habari gani?',
                    en: 'Hello, how are you?',
                  }),
                },
              ],
            },
          },
        ],
      }),
      { status: 200 },
    );
  };
  try {
    const audioBuffer = Buffer.from('fake-audio-bytes');
    const result = await translateAudio(audioBuffer, 'audio/webm', 'voice-note-1.webm');
    assert.equal(result.transcript, 'Hello, how are you?');
    assert.equal(result.ml, 'ഹലോ, സുഖമാണോ?');
    assert.equal(result.manglish, 'Hello, sugamano?');
    assert.equal(result.sw, 'Hujambo, habari gani?');
    assert.equal(body.contents[0].parts[0].inlineData.mimeType, 'audio/webm');
    assert.equal(body.contents[0].parts[0].inlineData.data, audioBuffer.toString('base64'));
  } finally {
    globalThis.fetch = original;
  }
});
test('translateAudio accurately transcribes Malayalam spoken speech into verbatim transcript and translations', async () => {
  const original = globalThis.fetch;
  let body;
  globalThis.fetch = async (_url, options) => {
    body = JSON.parse(options.body);
    return new Response(
      JSON.stringify({
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    transcript: 'എവിടെയാ നീ? ഞാൻ ഇവിടെ കാത്തിരിക്കുവാ',
                    ml: 'എവിടെയാ നീ? ഞാൻ ഇവിടെ കാത്തിരിക്കുവാ',
                    manglish: 'Evideya nee? Njan ivide kaathirikkuva',
                    sw: 'Uko wapi? Ninakusubiri hapa',
                    en: 'Where are you? I am waiting here',
                  }),
                },
              ],
            },
          },
        ],
      }),
      { status: 200 },
    );
  };
  try {
    const audioBuffer = Buffer.from('voice-bytes-malayalam');
    const result = await translateAudio(audioBuffer, 'audio/ogg', 'voice-note-ml.ogg');
    assert.equal(result.transcript, 'എവിടെയാ നീ? ഞാൻ ഇവിടെ കാത്തിരിക്കുവാ');
    assert.equal(result.ml, 'എവിടെയാ നീ? ഞാൻ ഇവിടെ കാത്തിരിക്കുവാ');
    assert.equal(result.manglish, 'Evideya nee? Njan ivide kaathirikkuva');
    assert.equal(result.en, 'Where are you? I am waiting here');
    assert.match(body.systemInstruction.parts[0].text, /multilingual audio transcriber/);
  } finally {
    globalThis.fetch = original;
  }
});
test('translateAudio rejects when provider fails or truncates', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'incomplete' }] } }],
      }),
    );
  try {
    await assert.rejects(
      () => translateAudio(Buffer.from('bytes'), 'audio/webm'),
      /could not be completed/,
    );
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
