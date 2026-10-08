import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({ headless: true });
const base = process.env.QA_URL || 'http://127.0.0.1:4173';
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  let socket;
  let revision = 'pending';
  const message = { id: 'incoming', conversation_id: 'chat', sender_id: 'other', source_language: 'en', text: 'How are you?', sender: { id: 'other', name: 'Bestie' }, translation: { status: 'pending' }, seq: 1, created_at: new Date().toISOString() };
  const user = { id: 'self', name: 'Me', handle: 'me', language: 'ml', ai_consent: true };
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let body = {};
    if (path === '/api/auth/session') body = { user, csrf: 'test' };
    if (path === '/api/capabilities') body = { registration: true, translation: true, speech: true };
    if (path === '/api/calls/current') body = null;
    if (path === '/api/conversations') body = [{ id: 'chat', peer: { id: 'other', name: 'Bestie', handle: 'bestie' }, peer_read_seq: 0 }];
    if (path === '/api/messages/incoming') body = { ...message, translation: revision === 'ready' ? { status: 'ready', text: 'സുഖമാണോ?' } : message.translation };
    if (path === '/api/messages/outgoing') body = { ...message, id: 'outgoing', sender_id: 'self' };
    if (path.endsWith('/messages')) body = { messages: revision === 'ready' ? [
      { ...message, translation: { language: 'ml', status: 'ready', text: 'സുഖമാണോ?' } },
      { ...message, id: 'sent', seq: 2, sender_id: 'self', text: 'Hello', translation: null, receiver_translation: { language: 'ml', status: 'ready', text: 'നമസ്കാരം' } },
    ] : [], has_more: false };
    if (path.endsWith('/calls')) body = [];
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.routeWebSocket(/socket\.io/, ws => {
    socket = ws;
    ws.send('0' + JSON.stringify({ sid: 'qa', upgrades: [], pingInterval: 25000, pingTimeout: 20000, maxPayload: 1000000 }));
    ws.onMessage(data => {
      if (String(data).startsWith('40')) ws.send('40' + JSON.stringify({ sid: 'qa' }));
      if (data === '2') ws.send('3');
    });
  });
  await page.goto(base);
  await page.locator('.connection-indicator.online').waitFor();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const sound = page.getByRole('checkbox', { name: 'Play a sound for new messages' });
  await sound.waitFor();
  assert.equal(await sound.isChecked(), true);
  await page.getByRole('button', { name: 'Test message sound' }).click();
  await sound.uncheck();
  assert.equal(await page.getByRole('button', { name: 'Test message sound' }).isDisabled(), true);
  await sound.check();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  socket.send('42' + JSON.stringify(['message:arrived', { message_id: 'incoming', sender_id: 'other', conversation_id: 'chat' }]));
  await page.locator('.incoming-message-alert').waitFor();
  assert.match(await page.locator('.incoming-message-alert').innerText(), /Bestie/);
  assert.match(await page.locator('.incoming-message-alert').innerText(), /Translating/);
  revision = 'ready';
  socket.send('42' + JSON.stringify(['message:changed', { message_id: 'incoming', conversation_id: 'chat' }]));
  await page.locator('.incoming-message-alert').getByText('സുഖമാണോ?', { exact: true }).waitFor();
  assert.equal(await page.locator('.toast').count(), 0);
  await page.screenshot({ path: 'test-results/message-alert-mobile.png' });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator('.incoming-message-open').click();
  await page.locator('.chat-header').waitFor();
  await page.locator('.sender-original').getByText('How are you?', { exact: true }).waitFor();
  assert.equal(await page.locator('.message:not(.mine) .bubble > p').innerText(), 'സുഖമാണോ?');
  assert.equal(await page.locator('.sender-original p').evaluate(element => getComputedStyle(element).color), 'rgb(35, 115, 62)');
  assert.equal(await page.locator('.message.mine .receiver-preview p').evaluate(element => getComputedStyle(element).color), 'rgb(20, 87, 160)');
  await page.screenshot({ path: 'test-results/message-original-green-mobile.png' });
  assert.equal(await page.locator('.incoming-message-alert').count(), 0);
  socket.send('42' + JSON.stringify(['message:arrived', { message_id: 'incoming', sender_id: 'other', conversation_id: 'chat' }]));
  socket.send('42' + JSON.stringify(['message:arrived', { message_id: 'outgoing', sender_id: 'self', conversation_id: 'chat' }]));
  await page.getByRole('button', { name: 'Chat settings', exact: true }).click();
  await page.getByRole('button', { name: 'Test message sound' }).waitFor();
  assert.equal(await page.locator('.incoming-message-alert').count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: incoming banner, translated preview update, sound controls, tap opens chat, no duplicate/self alerts, mobile layout.');
} finally { await browser.close(); }
