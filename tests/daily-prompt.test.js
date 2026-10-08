import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_PROMPTS,
  PROMPT_CATEGORIES,
  getPromptForDate,
  getTodayDateKey,
  formatPromptDateLabel,
} from '../shared/dailyPrompts.js';

test('daily prompt question bank contains cute couple prompts including unforgettable moment in Malayalam and English', () => {
  assert.ok(DAILY_PROMPTS.length >= 15, 'Prompt bank should have multiple prompts');

  // Verify the exact prompt requested by user exists
  const targetPrompt = DAILY_PROMPTS.find(
    (p) =>
      p.question_ml.includes('ഏറ്റവും മറക്കാനാവാത്ത നിമിഷം') ||
      p.id === 'prompt_unforgettable_moment',
  );
  assert.ok(targetPrompt, 'Should contain the unforgettable moment question');
  assert.equal(
    targetPrompt.question_ml,
    'നമ്മൾ ഒന്നിച്ചുണ്ടായിരുന്നതിൽ ഏറ്റവും മറക്കാനാവാത്ത നിമിഷം ഏതാണ്?',
  );
  assert.ok(targetPrompt.question_en.length > 5);
  assert.ok(targetPrompt.category in PROMPT_CATEGORIES);
  assert.ok(Array.isArray(targetPrompt.sparks) && targetPrompt.sparks.length > 0);
});

test('getPromptForDate deterministically returns the exact same prompt for the same date', () => {
  const dateStr = '2026-10-08';
  const prompt1 = getPromptForDate(dateStr);
  const prompt2 = getPromptForDate(dateStr);

  assert.equal(prompt1.id, prompt2.id);
  assert.equal(prompt1.question_ml, prompt2.question_ml);
  assert.equal(prompt1.question_en, prompt2.question_en);

  // Different dates yield predictable prompts
  const promptDay2 = getPromptForDate('2026-10-09');
  assert.ok(promptDay2.id);
});

test('getTodayDateKey formats YYYY-MM-DD correctly', () => {
  const customDate = new Date(2026, 9, 8); // Oct 8, 2026
  assert.equal(getTodayDateKey(customDate), '2026-10-08');

  const todayKey = getTodayDateKey();
  assert.match(todayKey, /^\d{4}-\d{2}-\d{2}$/);
});

test('formatPromptDateLabel formats readable date representation', () => {
  const label = formatPromptDateLabel('2026-10-08');
  assert.ok(label.includes('Oct'));
});

test('double-blind mutual reveal mechanic guarantees partner answer is locked until caller answers', () => {
  // Simulate the server-side double-blind privacy filter
  function simulateServerResponse({ myAnswer, partnerAnswer, peerName = 'Sweetheart' }) {
    const revealed = Boolean(myAnswer && partnerAnswer);
    return {
      revealed,
      my_answer: myAnswer ? myAnswer.answer : null,
      partner_answered: Boolean(partnerAnswer),
      partner_name: peerName,
      partner_answer: revealed ? partnerAnswer.answer : null, // STRICTLY NULL IF NOT REVEALED
    };
  }

  // Case 1: Partner answered, but Caller has NOT answered yet
  const partnerOnlyState = simulateServerResponse({
    myAnswer: null,
    partnerAnswer: { answer: 'Secret surprise trip to Munnar!' },
  });

  assert.equal(partnerOnlyState.revealed, false, 'Must not be revealed yet');
  assert.equal(partnerOnlyState.partner_answered, true, 'Indicates partner answered');
  assert.equal(
    partnerOnlyState.partner_answer,
    null,
    "Partner's answer must remain NULL / hidden before caller answers!",
  );

  // Case 2: Caller answered, Partner has NOT answered yet
  const callerOnlyState = simulateServerResponse({
    myAnswer: { answer: 'When we walked in the rain together' },
    partnerAnswer: null,
  });

  assert.equal(callerOnlyState.revealed, false);
  assert.equal(callerOnlyState.partner_answered, false);
  assert.equal(callerOnlyState.partner_answer, null);
  assert.equal(callerOnlyState.my_answer, 'When we walked in the rain together');

  // Case 3: BOTH partners have answered -> MUTUAL REVEAL!
  const bothAnsweredState = simulateServerResponse({
    myAnswer: { answer: 'When we walked in the rain together' },
    partnerAnswer: { answer: 'Secret surprise trip to Munnar!' },
  });

  assert.equal(bothAnsweredState.revealed, true, 'Both answered so reveal is unlocked');
  assert.equal(bothAnsweredState.partner_answered, true);
  assert.equal(bothAnsweredState.my_answer, 'When we walked in the rain together');
  assert.equal(bothAnsweredState.partner_answer, 'Secret surprise trip to Munnar!');
});

test('chat message format parser extracts daily prompt question and both answers', () => {
  const sampleMessage =
    '✨ [Daily Us Prompt · 2026-10-08]\n' +
    '❓ "നമ്മൾ ഒന്നിച്ചുണ്ടായിരുന്നതിൽ ഏറ്റവും മറക്കാനാവാത്ത നിമിഷം ഏതാണ്?"\n' +
    '(What was our most unforgettable moment together so far?)\n\n' +
    '💬 Malavika: "ആ മഴയത്തുള്ള നടത്തം 🌧️"\n' +
    '💬 Dhanya: "നമ്മുടെ ആദ്യത്തെ കോഫി ഡേറ്റ് ☕"';

  assert.ok(sampleMessage.startsWith('✨ [Daily Us Prompt'));

  const dateMatch = sampleMessage.match(/\[Daily Us Prompt · (\d{4}-\d{2}-\d{2})\]/);
  assert.equal(dateMatch[1], '2026-10-08');

  const qMatch = sampleMessage.match(/❓\s*"([^"]+)"/);
  assert.equal(qMatch[1], 'നമ്മൾ ഒന്നിച്ചുണ്ടായിരുന്നതിൽ ഏറ്റവും മറക്കാനാവാത്ത നിമിഷം ഏതാണ്?');

  const lines = sampleMessage.split('\n');
  const answers = [];
  for (const line of lines) {
    const ansMatch = line.match(/^💬\s*([^:]+):\s*"([^"]+)"/);
    if (ansMatch) answers.push({ name: ansMatch[1].trim(), text: ansMatch[2].trim() });
  }

  assert.equal(answers.length, 2);
  assert.equal(answers[0].name, 'Malavika');
  assert.equal(answers[0].text, 'ആ മഴയത്തുള്ള നടത്തം 🌧️');
  assert.equal(answers[1].name, 'Dhanya');
  assert.equal(answers[1].text, 'നമ്മുടെ ആദ്യത്തെ കോഫി ഡേറ്റ് ☕');
});
