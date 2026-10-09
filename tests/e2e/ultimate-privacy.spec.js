import { test, expect } from '@playwright/test';
import { setupPrivacy, seedLock, enterPin, readLock, mediaId } from './privacy-fixture.js';

test('decoy PIN opens only functional groceries and real PIN remains required for private chat', async ({ page }) => {
  const state = await setupPrivacy(page);
  await seedLock(page);
  await expect(page.getByRole('heading', { name: 'Sanctuary locked' })).toBeVisible();
  const reads = state.reads();
  await enterPin(page, '654321');
  await expect(page.getByRole('heading', { name: 'Groceries', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'My Person', exact: true })).toHaveCount(0);
  expect(state.reads()).toBe(reads);
  await expect(page).toHaveTitle('My Lists');
  await page.getByLabel('Add grocery item').fill('Apples');
  await page.getByRole('button', { name: 'Add item', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Apples', exact: true })).toBeVisible();
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await page.keyboard.press('PrintScreen');
  await expect(page.getByRole('heading', { name: 'Groceries', exact: true })).toBeVisible();
  expect(state.reports.length).toBe(0);
  await page.getByRole('button', { name: 'Lock lists' }).click();
  await enterPin(page, '123456');
  await expect(page.getByRole('heading', { name: 'My Person', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
  await page.locator('.app-lock-settings').getByRole('button', { name: 'Lock now' }).click();
  await enterPin(page, '654321');
  await expect(page.getByRole('button', { name: 'Apples', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sanctuary locked' })).toBeVisible();
});

test('settings require real PIN, reject identical decoys, and store only derived PIN records', async ({ page }) => {
  await setupPrivacy(page); await seedLock(page, false); await enterPin(page, '123456');
  await page.getByRole('button', { name: 'Settings', exact: true }).first().click();
  const settings = page.locator('.app-lock-settings');
  await settings.getByLabel('Current 6-digit PIN').fill('123456');
  await settings.getByLabel('Choose a Decoy PIN').fill('123456');
  await settings.getByLabel('Confirm Decoy PIN').fill('123456');
  await settings.getByRole('button', { name: 'Enable Decoy PIN', exact: true }).click();
  await expect(settings.getByRole('alert')).toContainText('different from your real PIN');
  await settings.getByLabel('Choose a Decoy PIN').fill('654321');
  await settings.getByLabel('Confirm Decoy PIN').fill('654321');
  await settings.getByRole('button', { name: 'Enable Decoy PIN', exact: true }).click();
  await expect(settings.getByRole('status')).toContainText('Decoy PIN saved');
  const record = await readLock(page);
  expect(record.decoyPin.hash).toBeTruthy();
  expect(JSON.stringify(record)).not.toContain('654321');
  await settings.getByLabel('Current 6-digit PIN').fill('000000');
  await settings.getByRole('button', { name: 'Disable Decoy PIN', exact: true }).click();
  await expect(settings.getByRole('alert')).toContainText('Incorrect current PIN');
  expect(Boolean((await readLock(page)).decoyPin)).toBe(true);
});

test('entering decoy PIN locks another open tab of the same account', async ({ page, context }) => {
  await setupPrivacy(page); await seedLock(page); await enterPin(page, '123456');
  const second = await context.newPage();
  await setupPrivacy(second); await enterPin(second, '123456');
  await expect(second.getByRole('heading', { name: 'My Person', exact: true })).toBeVisible();
  await page.reload(); await enterPin(page, '654321');
  await expect(page.getByRole('heading', { name: 'Groceries', exact: true })).toBeVisible();
  await expect(second.getByRole('heading', { name: 'Sanctuary locked' })).toBeVisible();
  await expect(second.getByRole('heading', { name: 'My Person', exact: true })).toHaveCount(0);
  await second.close();
});

test('mobile decoy view has no chat branding or horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setupPrivacy(page); await seedLock(page); await enterPin(page, '654321');
  const lists = page.locator('.decoy-lists');
  await expect(lists).toBeVisible();
  expect(await lists.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await expect(page.getByText('Kipenzi', { exact: false })).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/privacy-decoy-mobile.png', fullPage: true });
});

test('trusted screenshot shortcut reports once; fake events and focus changes do not claim screenshots', async ({ page }) => {
  const state = await setupPrivacy(page);
  await expect(page.getByRole('heading', { name: 'My Person', exact: true })).toBeVisible();
  await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'PrintScreen' })));
  expect(state.reports.length).toBe(0);
  await page.keyboard.press('PrintScreen');
  await expect.poll(() => state.reports.length).toBe(1);
  expect(state.reports[0].kind).toBe('screenshot_shortcut');
  expect(state.reports[0].message_id).toBeUndefined();
  await page.locator('.capture-privacy-notice summary').click();
  await expect(page.locator('.capture-privacy-notice')).toContainText('cannot reliably detect OS screenshots');
  await expect(page.locator('.capture-privacy-notice')).toContainText('cannot be confirmed');
});

test('view-once capture attempt carries media context and viewer closes on blur without a false report', async ({ page }) => {
  const state = await setupPrivacy(page, { media: true });
  await page.getByRole('button', { name: 'Open view-once photo' }).click();
  await expect(page.getByRole('dialog', { name: 'View-once media' })).toBeVisible();
  await page.keyboard.press('PrintScreen');
  await expect.poll(() => state.reports.length).toBe(1);
  expect(state.reports[0].message_id).toBe(mediaId);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('dialog', { name: 'View-once media' })).toHaveCount(0);
  expect(state.reports.length).toBe(1);
  await expect(page.getByRole('button', { name: 'View-once media opened' })).toBeDisabled();
});

test('partner gets a privacy alert that describes a shortcut without claiming capture was completed', async ({ page }) => {
  const state = await setupPrivacy(page);
  await expect(page.getByRole('heading', { name: 'My Person', exact: true })).toBeVisible();
  await expect.poll(state.connected).toBe(true);
  state.partnerAlert();
  const alert = page.locator('.incoming-message-alert');
  await expect(alert).toContainText('My Person used a screenshot shortcut');
  await expect(alert).toContainText('cannot be confirmed');
});

test('failed capture delivery can be retried with the same idempotency identifier', async ({ page }) => {
  const state = await setupPrivacy(page, { failCapture: true });
  await expect(page.getByRole('heading', { name: 'My Person', exact: true })).toBeVisible();
  await page.keyboard.press('PrintScreen');
  await page.locator('.capture-privacy-notice summary').click();
  await expect(page.locator('.capture-privacy-notice')).toContainText('could not be sent');
  await page.getByRole('button', { name: 'Retry alert' }).click();
  await expect.poll(() => state.reports.length).toBe(2);
  expect(state.reports[0].client_id).toBe(state.reports[1].client_id);
  await expect(page.locator('.capture-privacy-notice')).toContainText('Capture signal shared');
});
