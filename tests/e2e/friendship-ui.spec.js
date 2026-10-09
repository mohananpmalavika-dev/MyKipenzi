import { test, expect } from '@playwright/test';
import { setupPrivacy, peer, cid, mediaId } from './privacy-fixture.js';
import { featureText } from '../../shared/featureLocale.js';
const artifacts = 'artifacts/friendship-e2e';

for (const language of ['ml', 'manglish', 'sw']) {
  test(`receiver ${language}: English navigation, local feature content and the unchanged sender message`, async ({ page }) => {
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push(request.url()));
    await page.setViewportSize({ width: 1512, height: 982 });
    const original = 'ഞാൻ എന്നും നിന്റെ കൂടെയുണ്ട്. 🤍';
    const translated = { ml: 'ഞാൻ എപ്പോഴും നിന്റെ കൂടെയുണ്ട്. 🤍', manglish: 'Njan eppozhum ninte koodeyundu. 🤍', sw: 'Niko pamoja nawe daima. 🤍' }[language];
    await setupPrivacy(page, { language, messages: [{ id: mediaId, conversation_id: cid, sender_id: peer, client_id: mediaId, seq: '1', source_language: 'ml', text: original, created_at: new Date().toISOString(), translations: { [language]: { status: 'ready', text: translated } } }] });
    const message = page.locator(`#message-${mediaId}`);
    await expect(message.getByText(translated, { exact: true })).toBeVisible();
    await expect(message.locator('.sender-original p')).toHaveText(original);
    await expect(message.locator('.sender-original small')).toContainText(featureText('Sender’s original message', language));
    await expect(page.locator('.rail-items').getByRole('button', { name: 'Chats', exact: true })).toBeVisible();
    await page.locator('.together-button').click();
    const dialog = page.getByRole('dialog', { name: 'Together · Your friendship toolkit' });
    await expect(dialog.locator('.friendship-feature-card strong').filter({ hasText: featureText('Listen together', language) })).toBeVisible();
    await dialog.getByLabel('Search friendship features').fill(featureText('Game night', language));
    await expect(dialog.locator('.friendship-feature-card')).toHaveCount(1);
    await dialog.locator('.friendship-feature-card').click();
    const game = page.getByRole('dialog', { name: 'Couple Games and Trivia' });
    await expect(game).toBeVisible();
    await expect(game.getByText(featureText("What is my absolute comfort food when I'm stressed or down?", language), { exact: true })).toBeVisible();
    expect(requests.some(url => url.includes('/features/localize') || url.includes('generativelanguage.googleapis.com'))).toBe(false);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `${artifacts}/receiver-${language}-game.png` });
  });
}

test('deleted messages never disclose a retained source or translation', async ({ page }) => {
  await setupPrivacy(page, { language: 'sw', messages: [{ id: mediaId, conversation_id: cid, sender_id: peer, client_id: mediaId, seq: '1', source_language: 'ml', text: 'Deleted secret', deleted_at: new Date().toISOString(), created_at: new Date().toISOString(), translation: { language: 'sw', status: 'ready', text: 'Deleted translation' } }] });
  const message = page.locator(`#message-${mediaId}`);
  await expect(message.getByText('Message deleted', { exact: true })).toBeVisible();
  await expect(message.locator('.sender-original')).toHaveCount(0);
  await expect(page.getByText('Deleted secret', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Deleted translation', { exact: true })).toHaveCount(0);
});

test('friendship toolkit supports search, categories, and opening saved messages', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1512, height: 982 });
  await setupPrivacy(page);
  await expect(page.getByLabel('Message', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${artifacts}/desktop-chat.png` });
  await page.locator('.together-button').click();
  const dialog = page.getByRole('dialog', { name: 'Together · Your friendship toolkit' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Make memories', exact: true }).click();
  await expect(dialog.locator('.friendship-feature-card')).toHaveCount(4);
  await dialog.getByRole('button', { name: 'All', exact: true }).click();
  await dialog.getByLabel('Search friendship features').fill('starred');
  await expect(dialog.locator('.friendship-feature-card')).toHaveCount(1);
  await dialog.getByRole('button', { name: /Starred messages/ }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.locator('.together-button').click();
  await page.getByLabel('Search friendship features').fill('no-such-feature');
  await expect(page.getByRole('heading', { name: 'No features found' })).toBeVisible();
  await page.getByRole('button', { name: 'Show all features' }).click();
  await expect(page.locator('.friendship-feature-card')).toHaveCount(28);
  await page.screenshot({ path: `${artifacts}/desktop-toolkit.png` });
  expect(errors).toEqual([]);
});

test('mobile chat, Together navigation, and dark theme fit the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setupPrivacy(page);
  await expect(page.getByLabel('Message', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send message', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${artifacts}/mobile-chat.png` });
  await page.locator('.together-button').click();
  await expect(page.getByLabel('Search friendship features')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${artifacts}/mobile-toolkit.png` });
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Back to chats', exact: true }).click();
  await page.getByRole('button', { name: 'Unread', exact: true }).click();
  await expect(page.getByText('No unread conversations yet.')).toBeVisible();
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await expect(page.locator('.conversation')).toHaveCount(1);
  await page.getByRole('button', { name: 'Together', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'More ways to be there.' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Choose a conversation to begin/ }).first()).toBeDisabled();
  await page.getByRole('button', { name: /Switch to dark theme/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: `${artifacts}/mobile-together-dark.png` });
});

test('signed-out experience and empty workspace remain useful at desktop size', async ({ page }) => {
  await page.setViewportSize({ width: 1512, height: 982 });
  await page.route('**/api/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(new URL(route.request().url()).pathname.endsWith('/session') ? { user: null, csrf: 'test' } : { registration: true }) }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await page.screenshot({ path: `${artifacts}/desktop-auth.png` });
  await page.getByRole('button', { name: 'Create an account' }).click();
  await expect(page.getByLabel('Username', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${artifacts}/mobile-register.png`, fullPage: true });
  await page.unroute('**/api/**');
  await page.setViewportSize({ width: 1512, height: 982 });
  await setupPrivacy(page);
  await page.locator('.rail-items').getByRole('button', { name: 'Together', exact: true }).click();
  await page.screenshot({ path: `${artifacts}/desktop-together.png` });
});
