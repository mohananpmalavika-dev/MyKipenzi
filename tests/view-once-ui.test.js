import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createServer as createPortProbe } from 'node:net';
import { chromium, expect } from '@playwright/test';

const me = '11111111-1111-4111-8111-111111111111', peer = '22222222-2222-4222-8222-222222222222', cid = '33333333-3333-4333-8333-333333333333', mid = '44444444-4444-4444-8444-444444444444';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64');

test('view-once media has no automatic preview, opens once, and remains opened after reload; composer preserves the flag', async () => {
  const probe = createPortProbe();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const server = await createServer({ server: { host: '127.0.0.1', port, strictPort: true } });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.routeWebSocket('**/socket.io/**', socket => socket.close());
    const message = { id: mid, seq: '1', sender_id: peer, sender: { id: peer, name: 'Friend' }, conversation_id: cid, text: '', source_language: 'en', created_at: new Date().toISOString(), view_once: true, attachment: { id: 'photo', name: 'private.png', mime: 'image/png', size: png.length, view_once: true } };
    let opens = 0, reads = 0, uploads = 0;
    let videoBytes;
    const sends = [];
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let data = {};
      if (path.includes('/attachments/')) { reads++; return route.fulfill({ status: 403, json: { error: 'Blocked' } }); }
      if (path.endsWith('/view-once')) {
        opens++;
        assert.equal(route.request().method(), 'POST');
        assert.equal(route.request().headers()['x-csrf-token'], 'test');
        const mime = message.attachment.mime;
        const bytes = mime.startsWith('video/') ? videoBytes : png;
        message.view_once_opened_at = new Date().toISOString();
        message.attachment = null;
        return route.fulfill({ contentType: mime, headers: { 'cache-control': 'no-store' }, body: bytes });
      }
      if (path.endsWith('/uploads')) { uploads++; data = { id: 'uploaded-' + uploads }; }
      else if (path === '/api/auth/session') data = { user: { id: me, name: 'Reader', handle: 'reader', language: 'en', ai_consent: false }, csrf: 'test' };
      else if (path === '/api/conversations') data = [{ id: cid, read_seq: 1, unread: 0, peer: { id: peer, name: 'Friend', handle: 'friend', language: 'en' }, peer_read_seq: 0 }];
      else if (path.endsWith('/messages') && route.request().method() === 'POST') { sends.push(route.request().postDataJSON()); data = { id: mid, conversation_id: cid }; }
      else if (path.endsWith('/messages')) data = { messages: [message], has_more: false };
      else if (path === '/api/messages/' + mid) data = message;
      else if (path.endsWith('/calls')) data = [];
      else if (path.endsWith('/calls/current')) data = null;
      await route.fulfill({ json: data });
    });
    const url = 'http://127.0.0.1:' + server.httpServer.address().port + '/?chat=' + cid + '&account=' + me;
    await page.goto(url);
    await expect(page.getByRole('button', { name: 'Open view-once photo', exact: true })).toBeVisible({ timeout: 20000 });
    assert.equal(reads, 0);
    assert.equal(opens, 0);
    await page.getByRole('button', { name: 'Open view-once photo', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'View-once media', exact: true })).toBeVisible();
    await expect(page.getByRole('dialog').locator('img')).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('button', { name: /Download/ })).toHaveCount(0);
    await page.screenshot({ path: 'test-results/view-once-mobile.png' });
    const preview = await page.getByRole('dialog').locator('img').getAttribute('src');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'View-once media', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'View-once media opened' })).toBeDisabled();
    assert.equal(await page.evaluate(async url => { try { await fetch(url); return true; } catch { return false; } }, preview), false);
    await page.goto(url);
    await expect(page.getByRole('button', { name: 'View-once media opened' })).toBeDisabled();
    assert.equal(opens, 1);
    assert.equal(reads, 0);
    videoBytes = Buffer.from(await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 64;
      const context = canvas.getContext('2d');
      const stream = canvas.captureStream(10);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
      const chunks = [];
      recorder.ondataavailable = event => chunks.push(event.data);
      const finished = new Promise(resolve => { recorder.onstop = resolve; });
      recorder.start();
      const timer = setInterval(() => { context.fillStyle = '#9333ea'; context.fillRect(0, 0, 64, 64); }, 100);
      await new Promise(resolve => setTimeout(resolve, 2000));
      clearInterval(timer); recorder.stop(); await finished;
      stream.getTracks().forEach(track => track.stop());
      return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
    }));
    message.view_once_opened_at = null;
    message.attachment = { id: 'video', name: 'private.webm', mime: 'video/webm', size: videoBytes.length, view_once: true };
    await page.goto(url);
    await page.getByRole('button', { name: 'Open view-once video', exact: true }).click();
    const video = page.getByRole('dialog', { name: 'View-once media', exact: true }).locator('video');
    await expect(video).toBeVisible();
    await video.evaluate(element => element.pause());
    await expect(video).toHaveAttribute('controlslist', 'nodownload noremoteplayback');
    await video.evaluate(element => element.dispatchEvent(new Event('ended')));
    await expect(page.getByRole('dialog', { name: 'View-once media', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'View-once media opened' })).toBeDisabled();
    assert.equal(opens, 2);
    assert.equal(reads, 0);
    let expectedSends = 0;
    for (const [name, mimeType] of [['new-photo.png', 'image/png'], ['new-video.mp4', 'video/mp4']]) {
      await page.locator('input[type=file]').last().setInputFiles({ name, mimeType, buffer: png });
      const toggle = page.getByRole('checkbox', { name: 'View once', exact: true });
      await expect(toggle).not.toBeChecked();
      await toggle.check();
      await expect(page.getByRole('textbox', { name: 'Message', exact: true })).toBeDisabled();
      if (mimeType === 'image/png') await page.screenshot({ path: 'test-results/view-once-composer-mobile.png' });
      await page.locator('.composer-area button[type=submit]').click();
      await expect(page.locator('.queued-file')).toHaveCount(0);
      expectedSends++;
      await expect.poll(() => sends.length).toBe(expectedSends);
    }
    assert.equal(sends.length, 2);
    assert.ok(sends.every(input => input.view_once === true && !input.text && input.attachment_id));
    await page.locator('input[type=file]').last().setInputFiles({ name: 'normal.png', mimeType: 'image/png', buffer: png });
    await expect(page.getByRole('checkbox', { name: 'View once', exact: true })).not.toBeChecked();
    await page.locator('.composer-area button[type=submit]').click();
    await expect(page.locator('.queued-file')).toHaveCount(0);
    await expect.poll(() => sends.length).toBe(3);
    assert.equal(sends[2].view_once, false);
    assert.deepEqual(errors, []);
  } finally { await browser?.close(); await server.close(); }
});
