import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { build } from 'vite';
import { chromium, expect } from '@playwright/test';

test('production PWA restores private history and queued files offline, syncs once, and clears account data', async () => {
  const buildDirectory = await mkdtemp(join(tmpdir(), 'kipenzi-offline-'));
  await build({ logLevel: 'silent', build: { outDir: buildDirectory } });
  const user = { id: '11111111-1111-4111-8111-111111111111', name: 'Me', handle: 'me', language: 'en' };
  const cid = '22222222-2222-4222-8222-222222222222';
  let currentUser = user;
  let rejectSession = false;
  let failNextSend = false;
  let uploadCount = 0;
  const attempts = [];
  const messages = [{ id: '33333333-3333-4333-8333-333333333333', conversation_id: cid,
    sender_id: '44444444-4444-4444-8444-444444444444', text: 'History saved for offline reading',
    source_language: 'en', seq: 1, created_at: new Date().toISOString() }];
  const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.woff': 'font/woff' };
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const json = (data, status = 200) => { response.writeHead(status, { 'content-type': 'application/json' }); response.end(JSON.stringify(data)); };
    try {
      if (url.pathname.startsWith('/api/')) {
        if (url.pathname === '/api/auth/session') return json({ user: currentUser, csrf: 'fresh-token' }, rejectSession ? 401 : 200);
        if (url.pathname === '/api/auth/logout') { currentUser = null; return json({ ok: true }); }
        if (url.pathname === '/api/capabilities') return json({ registration: true });
        if (url.pathname === '/api/notifications/config') return json({ enabled: false });
        if (url.pathname === '/api/conversations') return json([{ id: cid, peer: { id: 'other', name: 'Bestie', handle: 'bestie', language: 'en' }, peer_read_seq: 0 }]);
        if (url.pathname.endsWith('/uploads')) {
          for await (const _chunk of request) { /* Consume the multipart body. */ }
          uploadCount++;
          return json({ id: '55555555-5555-4555-8555-555555555555' });
        }
        if (url.pathname.endsWith('/messages') && request.method === 'POST') {
          let body = '';
          for await (const chunk of request) body += chunk;
          const input = JSON.parse(body);
          attempts.push(input);
          assert.equal(request.headers['x-csrf-token'], 'fresh-token');
          if (failNextSend) { failNextSend = false; return json({ error: 'Temporary outage' }, 503); }
          const existing = messages.find(message => message.client_id === input.client_id);
          if (existing) return json(existing);
          const message = { ...input, id: crypto.randomUUID(), conversation_id: cid, sender_id: user.id, seq: messages.length + 1, created_at: new Date().toISOString() };
          messages.push(message);
          return json(message, 201);
        }
        if (url.pathname.endsWith('/messages')) return json({ messages, has_more: false });
        if (url.pathname.endsWith('/moods')) return json({ statuses: [] });
        if (/^\/api\/messages\//.test(url.pathname)) return json(messages.find(message => url.pathname.endsWith(message.id)) || {});
        return json([]);
      }
      if (url.pathname === '/probe.html') { response.writeHead(200, { 'content-type': 'text/html' }); return response.end('<title>Background sync probe</title>'); }
      const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      if (file.includes('..')) { response.writeHead(400); return response.end(); }
      const content = await readFile(join(buildDirectory, file));
      const extension = '.' + file.split('.').at(-1);
      response.writeHead(200, { 'content-type': types[extension] || 'application/octet-stream' });
      response.end(content);
    } catch { response.writeHead(404); response.end(); }
  });
  let browser, page;
  const errors = [];
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await page.locator('.conversation').click();
    await expect(page.locator('.bubble > p').filter({ hasText: 'History saved for offline reading' })).toBeVisible();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    const cachedPaths = await page.evaluate(async () => (await (await caches.open((await caches.keys()).find(key => key.startsWith('kipenzi-shell-')))).keys()).map(request => new URL(request.url).pathname));
    assert.ok(cachedPaths.includes('/') && cachedPaths.some(path => path.startsWith('/assets/')));
    assert.ok(!cachedPaths.some(path => path.startsWith('/api/')));

    await context.setOffline(true);
    await page.reload();
    await page.locator('.conversation').click();
    await expect(page.locator('.bubble > p').filter({ hasText: 'History saved for offline reading' })).toBeVisible();
    await expect(page.locator('.connection-indicator')).toContainText('Offline');
    await expect(page.locator('.offline-banner')).toBeVisible();
    await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Written while offline');
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(page.getByRole('article', { name: 'Queued message' })).toContainText('Written while offline');
    await expect(page.locator('.toast')).toHaveCount(0);
    await page.reload();
    await page.locator('.conversation').click();
    await expect(page.getByRole('article', { name: 'Queued message' })).toContainText('Written while offline');
    await mkdir('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/offline-chat-mobile.png' });
    await context.setOffline(false);
    await expect.poll(() => messages.filter(message => message.text === 'Written while offline').length).toBe(1);
    await expect(page.getByRole('article', { name: 'Queued message' })).toHaveCount(0);
    await expect(page.locator('.bubble > p').filter({ hasText: 'Written while offline' })).toBeVisible();

    // Use a probe without React/outbox timers to exercise the worker after the app closes.
    const probe = await context.newPage();
    await probe.goto(origin + '/probe.html');
    const cdp = await context.newCDPSession(probe);
    const registrations = [];
    cdp.on('ServiceWorker.workerRegistrationUpdated', event => registrations.push(...event.registrations));
    await cdp.send('ServiceWorker.enable');
    await expect.poll(() => registrations.length).toBeGreaterThan(0);
    const fileKey = await page.evaluate(async ({ cid, owner }) => {
      const { offlineStore } = await import('/offline-store.js');
      const key = crypto.randomUUID();
      await offlineStore.put({ owner, conversation_id: cid, input: { client_id: key, text: 'Persistent attachment', source_language: 'en' },
        file: new File(['offline attachment'], 'note.txt', { type: 'text/plain' }), status: 'queued', retryable: true, createdAt: Date.now(), leaseUntil: 0 });
      return key;
    }, { cid, owner: user.id });
    await page.close();
    failNextSend = true;
    const retryResult = await probe.evaluate(async owner => {
      const { flushOutbox } = await import('/offline-sync.js');
      try { await flushOutbox(owner); } catch { /* Simulated server outage. */ }
      const { offlineStore } = await import('/offline-store.js');
      const entry = (await offlineStore.list(owner))[0];
      return { status: entry.status, input: entry.input, fileName: entry.file.name };
    }, user.id);
    assert.equal(retryResult.status, 'queued');
    assert.ok(retryResult.input.attachment_id);
    assert.equal(retryResult.fileName, 'note.txt');
    messages.push({ ...messages[0], id: '77777777-7777-4777-8777-777777777777', seq: messages.length + 1, text: 'Incoming while the app was closed' });
    const registration = registrations.find(row => row.scopeURL === origin + '/' && !row.isDeleted);
    await cdp.send('ServiceWorker.dispatchSyncEvent', { origin, registrationId: registration.registrationId, tag: 'kipenzi-message-outbox', lastChance: false });
    await expect.poll(() => messages.filter(message => message.client_id === fileKey).length).toBe(1);
    assert.equal(uploadCount, 1);
    assert.deepEqual(attempts.filter(input => input.client_id === fileKey)[0], attempts.filter(input => input.client_id === fileKey)[1]);
    const savedDelivery = await probe.evaluate(async ({ owner, cid, key }) => {
      const { offlineStore } = await import('/offline-store.js');
      const messages = (await offlineStore.read(owner, '/conversations/' + cid + '/messages')).messages;
      return { sent: messages.some(message => message.client_id === key), incoming: messages.some(message => message.text === 'Incoming while the app was closed') };
    }, { owner: user.id, cid, key: fileKey });
    await expect.poll(async () => probe.evaluate(async ({ owner, cid }) => {
      const { offlineStore } = await import('/offline-store.js');
      return (await offlineStore.read(owner, '/conversations/' + cid + '/messages')).messages.some(message => message.text === 'Incoming while the app was closed');
    }, { owner: user.id, cid })).toBe(true);
    assert.equal(savedDelivery.sent, true);

    // A transaction lease prevents concurrent tabs/workers from delivering twice.
    const leaseResult = await probe.evaluate(async owner => {
      const { offlineStore } = await import('/offline-store.js');
      const key = crypto.randomUUID();
      await offlineStore.put({ owner, input: { client_id: key }, status: 'queued', createdAt: Date.now() });
      const claims = await Promise.all([offlineStore.claim(owner, key), offlineStore.claim(owner, key)]);
      await offlineStore.remove(key);
      return claims.filter(Boolean).length;
    }, user.id);
    assert.equal(leaseResult, 1);
    const expired = await probe.evaluate(async owner => {
      const { offlineStore } = await import('/offline-store.js');
      const path = '/conversations/expiry/messages';
      await offlineStore.cache(owner, path, { messages: [{ id: 'expired', text: 'secret', expires_at: new Date(Date.now() - 1000).toISOString() }, { id: 'live', reply: { text: 'expired quote', expires_at: new Date(Date.now() - 1000).toISOString() } }] });
      return offlineStore.read(owner, path);
    }, user.id);
    assert.deepEqual(expired, { messages: [{ id: 'live', reply: null }] });
    const signedIn = await context.newPage();
    await signedIn.goto(origin);
    await signedIn.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
    await context.setOffline(true);
    await signedIn.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(signedIn.getByRole('button', { name: 'Step inside', exact: true })).toBeVisible();
    await signedIn.reload();
    await expect(signedIn.getByRole('button', { name: 'Step inside', exact: true })).toBeVisible();
    await context.setOffline(false);
    await signedIn.reload();
    await expect(signedIn.getByRole('button', { name: 'Step inside', exact: true })).toBeVisible();
    assert.equal(currentUser, null);
    await signedIn.close();
    currentUser = user;
    await probe.evaluate(async user => {
      const { offlineStore } = await import('/offline-store.js');
      await offlineStore.setSession({ user, csrf: 'fresh-token' });
      await offlineStore.cache(user.id, '/conversations', [{ id: 'old-account-chat' }]);
    }, user);
    currentUser = { ...user, id: '66666666-6666-4666-8666-666666666666' };
    const accountSwitch = await probe.evaluate(async oldOwner => {
      const { offlineStore } = await import('/offline-store.js');
      const fresh = await (await fetch('/api/auth/session')).json();
      await offlineStore.setSession(fresh);
      return { history: await offlineStore.read(oldOwner, '/conversations'), queue: await offlineStore.list(oldOwner), features: await offlineStore.features() };
    }, user.id);
    assert.equal(accountSwitch.history, undefined);
    assert.deepEqual(accountSwitch.queue, []);
    assert.equal(accountSwitch.features.registration, true);
    rejectSession = true;
    const reopened = await context.newPage();
    await reopened.goto(origin);
    await expect(reopened.getByText('We couldn’t reach Kipenzi.')).toBeVisible();
    const cleared = await probe.evaluate(async () => (await (await import('/offline-store.js')).offlineStore.session())?.user);
    assert.equal(cleared, null);
    assert.deepEqual(errors, []);
  } catch (error) {
    if (page && !page.isClosed()) console.error('Offline test page:', await page.locator('body').innerText(), 'Runtime errors:', errors);
    throw error;
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
    assert.ok(resolve(buildDirectory).startsWith(resolve(tmpdir()) + sep + 'kipenzi-offline-'));
    await rm(buildDirectory, { recursive: true, force: true });
  }
});
