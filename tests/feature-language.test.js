import test from 'node:test';
import assert from 'node:assert/strict';
import { transformSync } from '@babel/core';
import plugin from '../scripts/feature-locale-plugin.mjs';
import { featureText, malayalamToManglish } from '../shared/featureLocale.js';
import { receiverMessageText } from '../shared/featureLanguage.js';
import pairs from '../shared/feature-pairs.json' with { type: 'json' };

test('built-in feature content follows the receiver language without translating names or requiring a provider', () => {
  assert.equal(featureText('Listen together', 'ml'), 'ഒരുമിച്ച് കേൾക്കാം');
  assert.equal(featureText('Listen together', 'manglish'), 'Orumichu kelkkam');
  assert.equal(featureText('Listen together', 'sw'), 'Sikilizeni pamoja');
  assert.equal(featureText('Wooden Desk', 'sw'), 'Dawati la mbao');
  assert.equal(featureText('What was our most unforgettable moment together so far?', 'sw'), 'Ni wakati gani wetu pamoja ambao hauwezi kusahaulika hadi sasa?');
  assert.match(featureText('What was our most unforgettable moment together so far?', 'ml'), /[\u0d00-\u0d7f]/);
  assert.doesNotMatch(featureText('What was our most unforgettable moment together so far?', 'manglish'), /[\u0d00-\u0d7f]/);
  assert.equal(malayalamToManglish('നമ്മുടെ കഥ'), 'nammute katha');
  assert.equal(featureText('Custom text <script> untouched', 'sw'), 'Custom text <script> untouched');
});

test('all catalogued built-in English/Malayalam variants include local Kiswahili content', () => {
  const missing = [...new Set(Object.values(pairs).map(pair => pair.en))].filter(text => featureText(text, 'sw') === text);
  assert.deepEqual(missing, [], 'Add a local Kiswahili entry when introducing new bilingual feature copy.');
});

test('receiver messages accept keyed translations, reject another language, and never expose deleted translations', () => {
  const message = { text: 'original', translation: { language: 'en', status: 'ready', text: 'Wrong language' }, translations: { sw: { status: 'ready', text: 'Ujumbe wangu' } } };
  assert.equal(receiverMessageText(message, 'sw'), 'Ujumbe wangu');
  assert.equal(receiverMessageText(message, 'ml'), null);
  assert.equal(receiverMessageText({ ...message, deleted_at: new Date().toISOString() }, 'sw'), null);
  assert.equal(receiverMessageText({ translation: { language: 'sw', status: 'pending', text: 'Old translation' } }, 'sw'), null);
  assert.equal(receiverMessageText({ translation: { language: 'sw', status: 'ready', text: '' } }, 'sw'), null);
});

test('feature transform wraps built-in labels, preserves user-written content and ignores the navigation shell', () => {
  const source = 'function Card(){return <section><h2>Listen together</h2><p>{message.text}</p><p>{revealed ? answer.text : "Hidden"}</p><strong>{action.title}</strong></section>}';
  const transformed = transformSync(source, { filename: 'C:/MyKipenzi/src/ListenTogether.jsx', plugins: [plugin], parserOpts: { plugins: ['jsx'] }, configFile: false, babelrc: false }).code;
  assert.match(transformed, /KipenziFeatureText value="Listen together"|KipenziFeatureText value=\{"Listen together"\}/);
  assert.match(transformed, /<p>\{message.text\}<\/p>/);
  assert.match(transformed, /revealed \? answer.text : "Hidden"/);
  assert.doesNotMatch(transformed, /KipenziFeatureText value=\{message.text/);
  assert.match(transformed, /KipenziFeatureText value=\{action.title\}/);
  const shell = transformSync(source, { filename: 'C:/MyKipenzi/src/App.jsx', plugins: [plugin], parserOpts: { plugins: ['jsx'] }, configFile: false, babelrc: false }).code;
  assert.doesNotMatch(shell, /KipenziFeatureText/);
});
