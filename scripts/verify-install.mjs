import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({ headless: true });
const base = process.env.QA_URL || 'http://127.0.0.1:4173';
const errors = [];
async function pageFor({ loggedIn = false, ios = false, standalone = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ...(ios ? { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile Safari/604.1' } : {}) });
  if (standalone) await context.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let body = {};
    if (path === '/api/auth/session') body = { user: loggedIn ? { id: 'self', handle: 'me', name: 'Me', language: 'en' } : null, csrf: 'test' };
    if (path === '/api/capabilities') body = { registration: true, translation: true, speech: true };
    if (path === '/api/conversations') body = [{ id: 'chat', peer: { id: 'other', name: 'Bestie', handle: 'bestie', language: 'ml' }, peer_read_seq: 0 }];
    if (path.endsWith('/messages')) body = { messages: [], has_more: false };
    await route.fulfill({ json: body });
  });
  await page.goto(base);
  await page.getByRole('button', { name: loggedIn ? 'Connect with my ride-or-die' : 'Step inside', exact: true }).waitFor();
  return { page, context };
}
try {
  const { page } = await pageFor();
  await page.getByRole('button', { name: 'Install Kipenzi app' }).click();
  await page.getByRole('dialog').waitFor();
  assert.match(await page.getByRole('dialog').innerText(), /Install app or Add to Home screen/);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    event.prompt = () => { window.installCalled = true; return Promise.resolve(); };
    event.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(event);
  });
  await page.getByRole('button', { name: 'Install Kipenzi app' }).click();
  assert.equal(await page.evaluate(() => window.installCalled), true);
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  assert.equal(await page.getByRole('button', { name: 'Install Kipenzi app' }).count(), 0);
  const iphone = await pageFor({ ios: true });
  await iphone.page.getByRole('button', { name: 'Install Kipenzi app' }).click();
  assert.match(await iphone.page.getByRole('dialog').innerText(), /Safari/);
  await iphone.page.screenshot({ path: 'test-results/install-iphone.png' });
  const chat = await pageFor({ loggedIn: true });
  assert.ok(await chat.page.getByRole('button', { name: 'Install Kipenzi app' }).count());
  await chat.page.locator('.conversation').click();
  await chat.page.locator('.header-actions').getByRole('button', { name: 'Install Kipenzi app' }).waitFor();
  await chat.page.screenshot({ path: 'test-results/install-chat-mobile.png' });
  assert.ok(await chat.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const installed = await pageFor({ standalone: true });
  assert.equal(await installed.page.getByRole('button', { name: 'Install Kipenzi app' }).count(), 0);
  const manifest = await (await page.request.get(`${base}/manifest.webmanifest`)).json();
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) {
    const response = await page.request.get(base + icon.src);
    assert.equal(response.status(), 200);
    assert.match(response.headers()['content-type'], /image\/png/);
  }
  console.log('UI checks passed. SW registration:', await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map(r => ({ scope: r.scope, active: r.active?.state, installing: r.installing?.state }))));
  await page.evaluate(() => Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Service worker activation timed out')), 12000))]));
  await page.reload();
  assert.equal(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)), true);
  const cachesUsed = await page.evaluate(async () => Promise.all((await caches.keys()).map(async key => (await (await caches.open(key)).keys()).map(req => new URL(req.url).pathname))));
  assert.deepEqual(cachesUsed.flat(), ['/offline.html']);
  const cdp = await page.context().newCDPSession(page);
  const installability = await cdp.send('Page.getInstallabilityErrors');
  console.log('Installability:', JSON.stringify(installability));
  assert.equal(installability.installabilityErrors.length, 0);
  await page.context().setOffline(true);
  await page.reload();
  await page.getByText('You’re offline', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: login/chat install UI, native prompt, iPhone instructions, standalone hiding, mobile layout, manifest/icons, installability, offline fallback, no private cache.');
} finally { await browser.close(); }
