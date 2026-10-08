import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium, expect } from '@playwright/test';

test('failed attachment retries preserve the message ID and uploaded file; history is readable', async () => {
  const cid = randomUUID(), attachmentId = randomUUID(), mid = randomUUID();
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  server.middlewares.use('/status-fixture', (_request, response) => {
    response.setHeader('Content-Type', 'text/html');
    response.end(`<link rel="stylesheet" href="/src/styles.css"><div id="root"></div><script type="module">
      import RefreshRuntime from '/@react-refresh';
      import React from '/node_modules/.vite/deps/react.js';
      import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
      RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type; window.__vite_plugin_react_preamble_installed__ = true;
      const { useMessageOutbox } = await import('/src/useMessageOutbox.js');
      const { OutgoingMessage, MessageHistory } = await import('/src/MessageStatus.jsx');
      function Fixture() {
        const outbox = useMessageOutbox();
        const [sent, setSent] = React.useState(false), [history, setHistory] = React.useState(false);
        const retry = async (key) => { const result = await outbox.retry(key); if (result) setSent(true); };
        return React.createElement('div', {},
          React.createElement('button', { onClick: () => outbox.enqueue('${cid}', { text: 'Original retry text', source_language: 'en', expires_in_seconds: 300 }, new File(['voice'], 'note.wav', { type: 'audio/wav' })) }, 'Send fixture'),
          ...outbox.entries.map((entry) => React.createElement(OutgoingMessage, { key: entry.input.client_id, entry, onRetry: retry, retryDisabled: false })),
          sent && React.createElement('p', {}, 'Sent successfully'),
          React.createElement('button', { onClick: () => setHistory(true) }, 'Open history'),
          history && React.createElement(MessageHistory, { message: { id: '${mid}' }, onClose: () => setHistory(false) }));
      }
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Fixture));
    </script>`);
  });
  server.middlewares.stack.unshift(server.middlewares.stack.pop());
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    let uploads = 0;
    const attempts = [];
    await page.route('**/api/**', async (route) => {
      if (route.request().url().endsWith('/uploads')) {
        uploads++;
        return route.fulfill({ json: { id: attachmentId } });
      }
      if (route.request().url().endsWith('/history')) return route.fulfill({ json: { history: [{ id: '1', text: 'Original version', edited_at: new Date().toISOString() }], current: { text: 'Current version text', edited_at: new Date().toISOString() } } });
      attempts.push(route.request().postDataJSON());
      if (attempts.length === 1) return route.fulfill({ status: 503, json: { error: 'Connection lost' } });
      return route.fulfill({ status: 201, json: { ...attempts[0], id: mid, conversation_id: cid } });
    });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/status-fixture`);
    await page.getByRole('button', { name: 'Send fixture' }).click();
    await expect(page.getByRole('article', { name: 'Failed message' })).toContainText('Original retry text');
    await expect(page.getByRole('article', { name: 'Failed message' })).toContainText('Connection lost');
    await mkdir('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/message-failed-mobile.png' });
    await page.getByRole('button', { name: 'Retry message' }).click();
    await expect(page.getByText('Sent successfully')).toBeVisible();
    assert.equal(uploads, 1);
    assert.equal(attempts.length, 2);
    assert.deepEqual(attempts[1], attempts[0]);
    assert.equal(attempts[1].attachment_id, attachmentId);
    assert.equal(attempts[1].expires_in_seconds, 300);
    await expect(page.getByRole('article', { name: 'Failed message' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Open history' }).click();
    await expect(page.getByRole('dialog', { name: 'Message editing history' })).toContainText('Original version');
    await expect(page.getByRole('dialog', { name: 'Message editing history' })).toContainText('Current version text');
    await page.screenshot({ path: 'test-results/message-history-mobile.png' });
  } finally { await browser?.close(); await server.close(); }
});
