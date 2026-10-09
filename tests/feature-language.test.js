import test from 'node:test';
import assert from 'node:assert/strict';
import { transformSync } from '@babel/core';
import plugin from '../scripts/feature-locale-plugin.mjs';
import { featureText } from '../shared/featureLocale.js';
import { receiverMessageText } from '../shared/featureLanguage.js';
import pairs from '../shared/feature-pairs.json' with { type: 'json' };

test('feature UI remains English for every message receive language', () => {
  for (const language of ['en', 'ml', 'manglish', 'sw']) {
    assert.equal(featureText('Listen together', language), 'Listen together');
    assert.equal(featureText('ഒരുമിച്ച് കേൾക്കാം', language), 'Listen together');
    assert.equal(featureText('🪄 രഹസ്യ മഷി', language), '🪄 Invisible Ink');
    assert.equal(featureText('പ്രണയ റോസ് മഞ്ഞ്', language), 'Rose Petal Mist');
    assert.equal(featureText('Malayalam', language), 'Malayalam');
  }
  assert.equal(featureText('Custom text <script> untouched', 'sw'), 'Custom text <script> untouched');
});

test('catalogued legacy feature labels normalize to English', () => {
  const missing = Object.keys(pairs).filter(text => /[\u0d00-\u0d7f]/.test(featureText(text)));
  assert.deepEqual(missing, [], 'Provide an English alias for new legacy feature labels.');
});

test('receiver messages accept keyed translations, reject another language, and never expose deleted translations', () => {
  const message = { text: 'original', translation: { language: 'en', status: 'ready', text: 'Wrong language' }, translations: { sw: { status: 'ready', text: 'Ujumbe wangu' } } };
  assert.equal(receiverMessageText(message, 'sw'), 'Ujumbe wangu');
  assert.equal(receiverMessageText(message, 'ml'), null);
  assert.equal(receiverMessageText({ ...message, deleted_at: new Date().toISOString() }, 'sw'), null);
  assert.equal(receiverMessageText({ translation: { language: 'sw', status: 'pending', text: 'Old translation' } }, 'sw'), null);
  assert.equal(receiverMessageText({ translation: { language: 'sw', status: 'ready', text: '' } }, 'sw'), null);
});

test('interface transform normalizes labels across the shell while preserving user-written content', () => {
  const source = 'function Card(){return <section><h2>Listen together</h2><p>{message.text}</p><p>{revealed ? answer.text : "Hidden"}</p><strong>{action.title}</strong></section>}';
  const transformed = transformSync(source, { filename: 'C:/MyKipenzi/src/ListenTogether.jsx', plugins: [plugin], parserOpts: { plugins: ['jsx'] }, configFile: false, babelrc: false }).code;
  assert.match(transformed, /KipenziFeatureText value="Listen together"|KipenziFeatureText value=\{"Listen together"\}/);
  assert.match(transformed, /<p>\{message.text\}<\/p>/);
  assert.match(transformed, /revealed \? answer.text : "Hidden"/);
  assert.doesNotMatch(transformed, /KipenziFeatureText value=\{message.text/);
  assert.match(transformed, /KipenziFeatureText value=\{action.title\}/);
  const shell = transformSync(source, { filename: 'C:/MyKipenzi/src/App.jsx', plugins: [plugin], parserOpts: { plugins: ['jsx'] }, configFile: false, babelrc: false }).code;
  assert.match(shell, /KipenziFeatureText/);
  assert.doesNotMatch(shell, /KipenziFeatureText value=\{message.text/);
});

test('English placeholders retain emoji as string expressions, avoiding visible Unicode escape text', () => {
  const transformed = transformSync('<textarea placeholder="എന്താണ് ആ രഹസ്യം? സ്നേഹവാക്കുകൾ ഇവിടെ കുറിക്കൂ... 💌" />', { filename: 'C:/MyKipenzi/src/InvisibleInkModal.jsx', plugins: [plugin], parserOpts: { plugins: ['jsx'] }, configFile: false, babelrc: false }).code;
  assert.match(transformed, /placeholder=\{/);
  assert.match(transformed, /What's the secret/);
  assert.doesNotMatch(transformed, /placeholder="/);
});
