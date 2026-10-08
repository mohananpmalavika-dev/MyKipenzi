import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium, expect } from '@playwright/test';

test('scheduling dialog creates, edits and cancels messages on mobile', async () => {
  const cid = randomUUID();
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  server.middlewares.use('/schedule-fixture', (_request, response) => {
    response.setHeader('Content-Type', 'text/html');
    response.end(`<link rel="stylesheet" href="/src/styles.css"><div id="root"></div><script type="module">
      import RefreshRuntime from '/@react-refresh';
      import React from '/node_modules/.vite/deps/react.js';
      import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      const { ScheduledMessages } = await import('/src/ScheduledMessages.jsx');
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(ScheduledMessages, { open: true, onClose: () => {}, conversationId: '${cid}', draft: 'Tomorrow hello', source: 'en' }));
    </script>`);
  });
  server.middlewares.stack.unshift(server.middlewares.stack.pop());
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const rows = [];
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      const method = request.method();
      if (method === 'GET') return route.fulfill({ json: { scheduled: rows } });
      if (method === 'POST') {
        rows.push({ ...request.postDataJSON(), id: randomUUID(), revision: 1, status: 'pending' });
        return route.fulfill({ status: 201, json: rows[0] });
      }
      if (method === 'PATCH') Object.assign(rows[0], request.postDataJSON(), { revision: 2 });
      if (method === 'DELETE') rows[0].status = 'cancelled';
      return route.fulfill({ json: rows[0] });
    });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/schedule-fixture`);
    await expect(page.getByLabel('Scheduled message text')).toHaveValue('Tomorrow hello');
    await page.getByLabel('Delivery time zone').selectOption('Asia/Kolkata');
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    await page.getByLabel('Delivery date and time').fill(`${tomorrow}T09:00`);
    await page.getByLabel('Schedule reminder').selectOption('15');
    await page.getByRole('button', { name: 'Schedule message', exact: true }).click();
    await expect(page.locator('.schedule-list')).toContainText('Tomorrow hello');
    assert.equal(rows[0].delivery_at, `${tomorrow}T03:30:00.000Z`);
    assert.equal(rows[0].reminder_minutes, 15);
    await page.getByRole('button', { name: 'Edit scheduled message' }).click();
    await page.getByLabel('Scheduled message text').fill('Updated hello');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(page.locator('.schedule-list')).toContainText('Updated hello');
    await page.getByRole('button', { name: 'Cancel scheduled message' }).click();
    await expect(page.locator('.schedule-list')).toContainText('Cancelled');
    await expect(page.getByRole('button', { name: 'Edit scheduled message' })).toHaveCount(0);
    assert.equal(await page.locator('dialog').evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth), true);
    await page.evaluate(() => document.documentElement.dataset.theme = 'dark');
    await page.locator('dialog').evaluate((dialog) => { dialog.scrollTop = 0; });
    await mkdir('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/scheduled-messages-mobile.png', fullPage: true });
  } finally { await browser?.close(); await server.close(); }
});
