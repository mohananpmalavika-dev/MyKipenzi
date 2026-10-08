import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const me = '11111111-1111-4111-8111-111111111111', peer = '22222222-2222-4222-8222-222222222222', cid = '33333333-3333-4333-8333-333333333333';
async function openMaker(page) {
  const sent = [];
  await page.route('**/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    let data = {};
    if (path === '/api/auth/session') data = { user: { id: me, name: 'Reader', handle: 'reader', language: 'ml', ai_consent: false }, csrf: 'test' };
    else if (path === '/api/conversations') data = [{ id: cid, read_seq: 0, unread: 0, peer: { id: peer, name: 'My person', handle: 'partner', language: 'en' }, peer_read_seq: 0 }];
    else if (path.endsWith('/uploads')) data = { id: '55555555-5555-4555-8555-555555555555', name: 'sticker-test.png', mime: 'image/png', size: 5000 };
    else if (path.endsWith('/messages') && request.method() === 'POST') {
      sent.push(request.postDataJSON()); data = { ...sent.at(-1), id: '66666666-6666-4666-8666-666666666666', seq: '1', sender_id: me, conversation_id: cid, created_at: new Date().toISOString() };
    } else if (path.endsWith('/messages')) data = { messages: [], has_more: false };
    else if (path.endsWith('/calls')) data = [];
    else if (path.endsWith('/calls/current')) data = null;
    await route.fulfill({ json: data });
  });
  await page.goto('/?chat=' + cid + '&account=' + me);
  await page.getByRole('button', { name: /My person New/ }).click();
  await page.getByRole('button', { name: 'Choose sticker', exact: true }).click();
  await page.getByRole('button', { name: 'Create a couple sticker from a photo or meme' }).click();
  return { modal: page.getByRole('dialog', { name: 'Custom Couple Stickers' }), sent };
}
async function imageFile(page, gradient = false) {
  const data = await page.evaluate(gradient => {
    const canvas = document.createElement('canvas'); canvas.width = 1000; canvas.height = 250;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ee4455'; if (gradient) { const paint = ctx.createLinearGradient(0, 0, 1000, 0); paint.addColorStop(0, '#ee4455'); paint.addColorStop(1, '#3366dd'); ctx.fillStyle = paint; } ctx.fillRect(0, 0, 1000, 250);
    return canvas.toDataURL('image/png').split(',')[1];
  }, gradient);
  return { name: 'couple-meme.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') };
}
test('photo to transparent captioned PNG, persistent library, reusable chat sticker', async ({ page }) => {
  const { modal, sent } = await openMaker(page);
  await expect(modal.getByRole('button', { name: 'Send as Sticker' })).toBeDisabled();
  await modal.getByLabel('Upload photo or meme').setInputFiles(await imageFile(page));
  await expect(modal.getByRole('button', { name: 'Send as Sticker' })).toBeEnabled();
  await modal.getByRole('button', { name: 'Meme card', exact: true }).click();
  const meme = await modal.locator('canvas').evaluate(canvas => ({ outside: canvas.getContext('2d').getImageData(256, 60, 1, 1).data[3], inside: canvas.getContext('2d').getImageData(256, 256, 1, 1).data[3] }));
  expect(meme).toEqual({ outside: 0, inside: 255 });
  await modal.getByRole('button', { name: 'Circle', exact: true }).click();
  const pixels = await modal.locator('canvas').evaluate(canvas => {
    const ctx = canvas.getContext('2d'); return { size: canvas.width, corner: [...ctx.getImageData(0, 0, 1, 1).data], top: [...ctx.getImageData(256, 65, 1, 1).data] };
  });
  expect(pixels.size).toBe(512); expect(pixels.corner[3]).toBe(0); expect(pixels.top).toEqual([238, 68, 85, 255]);
  await modal.getByLabel('Caption', { exact: true }).fill('എന്റെ പ്രിയമേ ❤️');
  await modal.getByRole('button', { name: 'Warm', exact: true }).click();
  await modal.getByRole('button', { name: 'Save to My Stickers' }).click();
  await expect(modal.getByRole('status')).toHaveText('Saved to My Stickers on this device.');
  await modal.getByRole('button', { name: 'Save to My Stickers' }).click();
  const saved = await page.evaluate(id => JSON.parse(localStorage.getItem('kipenzi_custom_stickers:' + id)), me);
  expect(saved).toHaveLength(1);
  const downloadPromise = page.waitForEvent('download');
  await modal.getByRole('button', { name: 'Download PNG' }).click();
  const download = await downloadPromise, bytes = await readFile(await download.path());
  expect(download.suggestedFilename()).toMatch(/^sticker-.*[.]png$/);
  expect(bytes.readUInt32BE(16)).toBe(512); expect(bytes.readUInt32BE(20)).toBe(512);
  await modal.screenshot({ path: 'test-results/couple-sticker-desktop.png' });
  await modal.getByRole('button', { name: 'Send as Sticker' }).click();
  await expect(modal).not.toBeVisible();
  await expect.poll(() => sent.length).toBe(1); expect(sent[0].attachment_id).toBeTruthy(); expect(sent[0].text).toBe('');
  await page.reload();
  await page.getByRole('button', { name: /My person New/ }).click();
  await page.getByRole('button', { name: 'Choose sticker', exact: true }).click();
  await page.getByRole('button', { name: /My Stickers/ }).click();
  await expect(page.getByRole('button', { name: 'Send saved custom sticker' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Send saved custom sticker' }).click();
  await expect.poll(() => sent.length).toBe(2);
  await page.getByRole('button', { name: 'Choose sticker', exact: true }).click();
  await page.getByRole('button', { name: 'Delete saved custom sticker' }).click();
  await expect(page.getByRole('button', { name: 'Send saved custom sticker' })).toHaveCount(0);
});
test('mobile crop, drop and paste, corrupt image, and failed storage stay recoverable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const { modal } = await openMaker(page);
  await modal.getByLabel('Upload photo or meme').setInputFiles({ name: 'corrupt.png', mimeType: 'image/png', buffer: Buffer.from('invalid image') });
  await expect(modal.getByRole('alert')).toContainText('could not be opened');
  const file = await imageFile(page, true);
  await modal.locator('.sticker-canvas-stage').evaluate((stage, data) => {
    const transfer = new DataTransfer(); const bytes = Uint8Array.from(atob(data), char => char.charCodeAt(0));
    transfer.items.add(new File([bytes], 'meme.png', { type: 'image/png' }));
    stage.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: transfer }));
  }, file.buffer.toString('base64'));
  await expect(modal.getByRole('button', { name: 'Send as Sticker' })).toBeEnabled();
  const box = await modal.locator('.sticker-canvas-stage').boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(375);
  await modal.getByLabel('Sticker zoom').fill('2');
  const before = await modal.locator('canvas').evaluate(canvas => canvas.toDataURL());
  const touch = await page.context().newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width / 2 + 30, y: box.y + box.height / 2 + 10 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => modal.locator('canvas').evaluate(canvas => canvas.toDataURL())).not.toBe(before);
  await page.evaluate(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key.startsWith('kipenzi_custom_stickers:')) throw new DOMException('Full', 'QuotaExceededError'); return set.call(this, key, value); }; });
  await modal.getByRole('button', { name: 'Save to My Stickers' }).click();
  await expect(modal.getByRole('alert')).toContainText('browser storage');
  await expect(modal.getByRole('button', { name: 'Download PNG' })).toBeEnabled();
  await page.evaluate(data => {
    const transfer = new DataTransfer(); transfer.items.add(new File([Uint8Array.from(atob(data), char => char.charCodeAt(0))], 'pasted.png', { type: 'image/png' }));
    window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer }));
  }, file.buffer.toString('base64'));
  await expect(modal.getByLabel('Sticker zoom')).toHaveValue('1');
  await modal.screenshot({ path: 'test-results/couple-sticker-mobile.png' });
});
