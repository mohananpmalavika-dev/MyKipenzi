import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
await mkdir('test-results', { recursive: true });
const browser = await chromium.launch({ headless: true });
const base = process.env.QA_URL || 'http://127.0.0.1:4173';
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const people = [{ id: 'one', name: 'Bestie', handle: 'bestie' }, { id: 'two', name: 'Dhanya', handle: 'dhanya' }, { id: 'three', name: 'Malavika', handle: 'malavika' }];
  let selected = null;
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    let body = {};
    if (url.pathname === '/api/auth/session') body = { user: { id: 'self', name: 'Me', handle: 'me', language: 'en' }, csrf: 'qa' };
    if (url.pathname === '/api/capabilities') body = { registration: true, translation: true };
    if (url.pathname === '/api/calls/current') body = null;
    if (url.pathname === '/api/users') {
      const query = (url.searchParams.get('q') || '').toLowerCase().replace(/^@/, '');
      const matches = people.filter(person => `${person.name} ${person.handle}`.toLowerCase().includes(query));
      const offset = Number(url.searchParams.get('offset') || 0);
      body = { users: matches.slice(offset, offset + 2), has_more: matches.length > offset + 2 };
    }
    if (url.pathname === '/api/conversations' && route.request().method() === 'POST') {
      selected = route.request().postDataJSON().handle;
      body = { id: 'chat' };
    } else if (url.pathname === '/api/conversations') body = selected ? [{ id: 'chat', peer: people.find(person => person.handle === selected), peer_read_seq: 0 }] : [];
    if (url.pathname.endsWith('/messages')) body = { messages: [], has_more: false };
    if (url.pathname.endsWith('/calls')) body = [];
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.routeWebSocket(/socket\.io/, ws => {
    ws.send('0' + JSON.stringify({ sid: 'qa', upgrades: [], pingInterval: 25000, pingTimeout: 20000, maxPayload: 1000000 }));
    ws.onMessage(data => { if (String(data).startsWith('40')) ws.send('40' + JSON.stringify({ sid: 'qa' })); });
  });
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: 'Connect with my ride-or-die', exact: true }).click();
  await page.getByRole('button', { name: 'Chat with Bestie (@bestie)', exact: true }).waitFor();
  assert.equal(await page.locator('.directory-user').count(), 2);
  await page.getByRole('button', { name: 'Load more users' }).click();
  await page.getByRole('button', { name: 'Chat with Malavika (@malavika)', exact: true }).waitFor();
  assert.equal(await page.locator('.directory-user').count(), 3);
  await page.screenshot({ path: 'test-results/user-directory-mobile.png' });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.getByRole('textbox', { name: 'Search users' }).fill('missing');
  await page.getByText('No users match your search.', { exact: true }).waitFor();
  await page.getByRole('textbox', { name: 'Search users' }).fill('@BESTIE');
  await page.getByRole('button', { name: 'Chat with Bestie (@bestie)', exact: true }).waitFor();
  assert.equal(await page.locator('.directory-user').count(), 1);
  await page.getByRole('button', { name: 'Chat with Bestie (@bestie)', exact: true }).click();
  await page.locator('.chat-header').getByRole('heading', { name: 'Bestie', exact: true }).waitFor();
  assert.equal(selected, 'bestie');
  assert.equal(await page.getByRole('dialog').count(), 0);
  assert.deepEqual(errors, []);
  console.log('PASS: user list, load more, empty search, name/handle search, tap opens chat, mobile layout.');
} finally { await browser.close(); }
