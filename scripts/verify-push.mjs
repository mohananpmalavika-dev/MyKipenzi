import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import webpush from 'web-push';
import { mkdir } from 'node:fs/promises';
await mkdir('test-results', { recursive: true });
const userId = '11111111-1111-4111-8111-111111111111';
const chatId = '22222222-2222-4222-8222-222222222222';
const publicKey = webpush.generateVAPIDKeys().publicKey;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const calls = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ publicKey }) => {
    window.pushQA = { permission: 'granted', permissionRequests: 0, subscribed: false, listeners: {} };
    Object.defineProperty(Notification, 'permission', { get: () => window.pushQA.permission });
    Notification.requestPermission = async () => { window.pushQA.permissionRequests++; return window.pushQA.permission; };
    const subscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/browser-test',
      options: {},
      toJSON: () => ({ endpoint: subscription.endpoint, keys: { p256dh: publicKey, auth: 'A'.repeat(22) } }),
      unsubscribe: async () => { window.pushQA.subscribed = false; return true; },
    };
    const worker = {
      update: async () => {},
      waiting: null,
      pushManager: {
        getSubscription: async () => window.pushQA.subscribed ? subscription : null,
        subscribe: async options => {
          subscription.options = { applicationServerKey: options.applicationServerKey.buffer };
          window.pushQA.subscribed = true;
          return subscription;
        },
      },
      getNotifications: async () => [],
    };
    Object.defineProperty(navigator, 'serviceWorker', { value: {
      register: async () => worker,
      getRegistration: async () => worker,
      ready: Promise.resolve(worker),
      addEventListener: (event, fn) => { window.pushQA.listeners[event] = fn; },
      removeEventListener: (event, fn) => { if (window.pushQA.listeners[event] === fn) delete window.pushQA.listeners[event]; },
    } });
  }, { publicKey });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let body = {};
    if (path === '/api/auth/session') body = { user: { id: userId, name: 'Me', handle: 'me', language: 'ml', ai_consent: true }, csrf: 'test' };
    if (path === '/api/capabilities') body = { translation: true, speech: true };
    if (path === '/api/calls/current') body = null;
    if (path === '/api/notifications/config') body = { enabled: true, public_key: publicKey };
    if (path === '/api/notifications/subscription') calls.push({ method: route.request().method(), body: route.request().postDataJSON() });
    if (path === '/api/conversations') body = [{ id: chatId, peer: { id: 'other', name: 'Bestie', handle: 'bestie' }, peer_read_seq: 0 }];
    if (path.endsWith('/messages')) body = { messages: [], has_more: false };
    if (path.endsWith('/calls')) body = [];
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.routeWebSocket(/socket\.io/, ws => {
    ws.send('0' + JSON.stringify({ sid: 'qa', upgrades: [], pingInterval: 25000, pingTimeout: 20000, maxPayload: 1000000 }));
    ws.onMessage(data => { if (String(data).startsWith('40')) ws.send('40' + JSON.stringify({ sid: 'qa' })); });
  });
  await page.goto('http://127.0.0.1:4173', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Enable background alerts', exact: true }).click();
  await page.getByText('Background message alerts enabled on this device.', { exact: true }).waitFor();
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].body.endpoint, 'https://fcm.googleapis.com/fcm/send/browser-test');
  assert.equal(await page.evaluate(() => window.pushQA.permissionRequests), 1);
  await page.screenshot({ path: 'test-results/background-alert-settings-mobile.png' });
  await page.getByRole('button', { name: 'Disable background alerts', exact: true }).click();
  await page.getByRole('button', { name: 'Enable background alerts', exact: true }).waitFor();
  assert.equal(calls[1].method, 'DELETE');
  assert.equal(await page.evaluate(() => window.pushQA.subscribed), false);
  await page.evaluate(() => { window.pushQA.permission = 'denied'; });
  await page.getByRole('button', { name: 'Enable background alerts', exact: true }).click();
  await page.getByText('Allow notifications in your phone or browser settings, then try again.', { exact: true }).waitFor();
  assert.equal(calls.length, 2);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.evaluate(({ userId, chatId }) => window.pushQA.listeners.message({ data: { type: 'OPEN_CHAT', user_id: userId, conversation_id: chatId } }), { userId, chatId });
  await page.locator('.chat-header').getByRole('heading', { name: 'Bestie', exact: true }).waitFor();
  await page.reload();
  await page.locator('.conversation').waitFor();
  await page.evaluate(() => window.pushQA.listeners.message({ data: { type: 'OPEN_CHAT', user_id: 'wrong-account', conversation_id: '22222222-2222-4222-8222-222222222222' } }));
  assert.equal(await page.locator('.chat-header').count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: background opt-in, opt-out, permission denial, notification-click chat routing, account isolation, mobile UI. Push delivery is mocked.');
} finally { await browser.close(); }
