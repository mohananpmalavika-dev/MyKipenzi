# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: friendship-ui.spec.js >> invisible-ink controls and theme menus are English while the actual secret stays unchanged
- Location: tests\e2e\friendship-ui.spec.js:48:1

# Error details

```
Error: expect(locator).not.toContainText(expected) failed

Locator: getByRole('dialog', { name: 'Invisible Ink Message Studio' })
Expected pattern: not /[\u0d00-\u0d7f]/
Received string: "Invisible Ink / Magic Fog 🪄🌫️A secret message your friend can scratch to reveal! Secret Note Secret Photo Fog Theme🌸Rose Petal MistRose Petal Mist🔮Mystic Lavender FogMystic Lavender Fog✨Golden StarlightGolden Starlight🌿Emerald AuroraEmerald Aurora Auto-refog Timer5 seconds (Fast)8 seconds (Default)12 seconds (Relaxed)20 seconds (Long)Your secret message: Message ideas (കാണിക്കുക)0 / 3000 Live preview (scratch below to try it):Invisible Ink 🪄 (Rose Petal Mist)🌸 Rose Petal Mistനിന്നെ ഒരുപാട് സ്നേഹിക്കുന്നു... ❤️ Scratch to reveal RevealCancel Send secret message 🪄"
Timeout: 5000ms

Call log:
  - Expect "not toContainText" getByRole('dialog', { name: 'Invisible Ink Message Studio' }) with timeout 5000ms
  - waiting for getByRole('dialog', { name: 'Invisible Ink Message Studio' })
    13 × locator resolved to <div role="dialog" aria-modal="true" class="invisible-ink-modal-overlay" aria-label="Invisible Ink Message Studio">…</div>
       - unexpected value "Invisible Ink / Magic Fog 🪄🌫️A secret message your friend can scratch to reveal! Secret Note Secret Photo Fog Theme🌸Rose Petal MistRose Petal Mist🔮Mystic Lavender FogMystic Lavender Fog✨Golden StarlightGolden Starlight🌿Emerald AuroraEmerald Aurora Auto-refog Timer5 seconds (Fast)8 seconds (Default)12 seconds (Relaxed)20 seconds (Long)Your secret message: Message ideas (കാണിക്കുക)0 / 3000 Live preview (scratch below to try it):Invisible Ink 🪄 (Rose Petal Mist)🌸 Rose Petal Mistനിന്നെ ഒരുപാട് സ്നേഹിക്കുന്നു... ❤️ Scratch to reveal RevealCancel Send secret message 🪄"

```

```yaml
- dialog "Invisible Ink Message Studio":
  - img
  - heading "Invisible Ink / Magic Fog 🪄🌫️" [level=3]
  - paragraph: A secret message your friend can scratch to reveal!
  - button "Close Invisible Ink modal":
    - img
  - button "Secret Note":
    - img
    - text: Secret Note
  - button "Secret Photo":
    - img
    - text: Secret Photo
  - img
  - text: Fog Theme
  - button "🌸 Rose Petal Mist Rose Petal Mist":
    - text: 🌸
    - strong: Rose Petal Mist
    - text: Rose Petal Mist
    - img
  - button "🔮 Mystic Lavender Fog Mystic Lavender Fog":
    - text: 🔮
    - strong: Mystic Lavender Fog
    - text: Mystic Lavender Fog
  - button "✨ Golden Starlight Golden Starlight":
    - text: ✨
    - strong: Golden Starlight
    - text: Golden Starlight
  - button "🌿 Emerald Aurora Emerald Aurora":
    - text: 🌿
    - strong: Emerald Aurora
    - text: Emerald Aurora
  - img
  - text: Auto-refog Timer
  - button "5 seconds (Fast)"
  - button "8 seconds (Default)"
  - button "12 seconds (Relaxed)"
  - button "20 seconds (Long)"
  - text: "Your secret message:"
  - button "Message ideas (കാണിക്കുക)":
    - img
    - text: Message ideas (കാണിക്കുക)
  - textbox "What's the secret? Write your message here... \\uD83D\\uDC8C"
  - text: 0 / 3000
  - img
  - text: "Live preview (scratch below to try it):"
  - img
  - strong: Invisible Ink 🪄 (Rose Petal Mist)
  - text: 🌸 Rose Petal Mist
  - paragraph: നിന്നെ ഒരുപാട് സ്നേഹിക്കുന്നു... ❤️
  - img
  - text: Scratch to reveal
  - button "Reveal":
    - img
    - text: Reveal
  - button "Cancel"
  - button "Send secret message 🪄" [disabled]:
    - img
    - text: Send secret message 🪄
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import { setupPrivacy, peer, cid, mediaId } from './privacy-fixture.js';
  3   | const artifacts = 'artifacts/friendship-e2e';
  4   | 
  5   | for (const language of ['ml', 'manglish', 'sw']) {
  6   |   test(`receiver ${language}: English interface with translated chat and unchanged sender message`, async ({ page }) => {
  7   |     const errors = [], requests = [];
  8   |     page.on('pageerror', error => errors.push(error.message));
  9   |     page.on('request', request => requests.push(request.url()));
  10  |     await page.setViewportSize({ width: 1512, height: 982 });
  11  |     const original = 'ഞാൻ എന്നും നിന്റെ കൂടെയുണ്ട്. 🤍';
  12  |     const translated = { ml: 'ഞാൻ എപ്പോഴും നിന്റെ കൂടെയുണ്ട്. 🤍', manglish: 'Njan eppozhum ninte koodeyundu. 🤍', sw: 'Niko pamoja nawe daima. 🤍' }[language];
  13  |     await setupPrivacy(page, { language, messages: [{ id: mediaId, conversation_id: cid, sender_id: peer, client_id: mediaId, seq: '1', source_language: 'ml', text: original, created_at: new Date().toISOString(), translations: { [language]: { status: 'ready', text: translated } } }] });
  14  |     const message = page.locator(`#message-${mediaId}`);
  15  |     await expect(message.getByText(translated, { exact: true })).toBeVisible();
  16  |     await expect(message.locator('.sender-original p')).toHaveText(original);
  17  |     await expect(message.locator('.sender-original small')).toContainText('Sender’s original message');
  18  |     await expect(page.locator('.rail-items').getByRole('button', { name: 'Chats', exact: true })).toBeVisible();
  19  |     await page.locator('.together-button').click();
  20  |     const dialog = page.getByRole('dialog', { name: 'Together · Your friendship toolkit' });
  21  |     await expect(dialog.locator('.friendship-feature-card strong').filter({ hasText: 'Listen together' })).toBeVisible();
  22  |     await expect(dialog).not.toContainText(/[\u0d00-\u0d7f]/);
  23  |     await expect(page.locator('.friendship-dock')).toContainText('Our little world');
  24  |     await expect(page.locator('.mood-widget')).toContainText('How is your heart today?');
  25  |     await expect(page.locator('.composer-hint')).toContainText('Invisible Ink');
  26  |     await dialog.getByLabel('Search friendship features').fill('Game night');
  27  |     await expect(dialog.locator('.friendship-feature-card')).toHaveCount(1);
  28  |     await dialog.locator('.friendship-feature-card').click();
  29  |     const game = page.getByRole('dialog', { name: 'Couple Games and Trivia' });
  30  |     await expect(game).toBeVisible();
  31  |     await expect(game.getByText("What is my absolute comfort food when I'm stressed or down?", { exact: true })).toBeVisible();
  32  |     await expect(game).not.toContainText(/[\u0d00-\u0d7f]/);
  33  |     expect(requests.some(url => url.includes('/features/localize') || url.includes('generativelanguage.googleapis.com'))).toBe(false);
  34  |     expect(errors).toEqual([]);
  35  |     await page.screenshot({ path: `${artifacts}/receiver-${language}-game.png` });
  36  |   });
  37  | }
  38  | 
  39  | test('deleted messages never disclose a retained source or translation', async ({ page }) => {
  40  |   await setupPrivacy(page, { language: 'sw', messages: [{ id: mediaId, conversation_id: cid, sender_id: peer, client_id: mediaId, seq: '1', source_language: 'ml', text: 'Deleted secret', deleted_at: new Date().toISOString(), created_at: new Date().toISOString(), translation: { language: 'sw', status: 'ready', text: 'Deleted translation' } }] });
  41  |   const message = page.locator(`#message-${mediaId}`);
  42  |   await expect(message.getByText('Message deleted', { exact: true })).toBeVisible();
  43  |   await expect(message.locator('.sender-original')).toHaveCount(0);
  44  |   await expect(page.getByText('Deleted secret', { exact: true })).toHaveCount(0);
  45  |   await expect(page.getByText('Deleted translation', { exact: true })).toHaveCount(0);
  46  | });
  47  | 
  48  | test('invisible-ink controls and theme menus are English while the actual secret stays unchanged', async ({ page }) => {
  49  |   await page.setViewportSize({ width: 1512, height: 982 });
  50  |   const secret = 'നിനക്കായി ഒരു ചെറിയ സർപ്രൈസ് 🤍';
  51  |   await setupPrivacy(page, { language: 'sw', messages: [{ id: mediaId, conversation_id: cid, sender_id: peer, client_id: mediaId, seq: '1', source_language: 'ml', text: `🪄 [Invisible Ink 🌫️ · theme:rose · hide:8s] ${secret}`, created_at: new Date().toISOString() }] });
  52  |   const card = page.locator('.invisible-ink-card');
  53  |   await expect(card.locator('.invisible-ink-header')).toContainText('Invisible Ink');
  54  |   await expect(card.locator('.ink-theme-pill')).toContainText('Rose Petal Mist');
  55  |   await expect(card.locator('.invisible-ink-header')).not.toContainText(/[\u0d00-\u0d7f]/);
  56  |   await expect(card.locator('.invisible-ink-footer')).not.toContainText(/[\u0d00-\u0d7f]/);
  57  |   await expect(card.locator('.ink-secret-text')).toHaveText(secret);
  58  |   await expect(page.locator('.friendship-dock')).toContainText('Our little world');
  59  |   await page.screenshot({ path: `${artifacts}/english-invisible-ink.png` });
  60  |   await page.locator('.together-button').click();
  61  |   await page.getByLabel('Search friendship features').fill('Invisible ink');
  62  |   await page.locator('.friendship-feature-card').click();
  63  |   const modal = page.getByRole('dialog', { name: 'Invisible Ink Message Studio' });
  64  |   await expect(modal).toBeVisible();
> 65  |   await expect(modal).not.toContainText(/[\u0d00-\u0d7f]/);
      |                           ^ Error: expect(locator).not.toContainText(expected) failed
  66  |   await page.screenshot({ path: `${artifacts}/english-invisible-ink-menu.png` });
  67  | });
  68  | 
  69  | test('friendship toolkit supports search, categories, and opening saved messages', async ({ page }) => {
  70  |   const errors = [];
  71  |   page.on('pageerror', error => errors.push(error.message));
  72  |   await page.setViewportSize({ width: 1512, height: 982 });
  73  |   await setupPrivacy(page);
  74  |   await expect(page.getByLabel('Message', { exact: true })).toBeVisible();
  75  |   await page.screenshot({ path: `${artifacts}/desktop-chat.png` });
  76  |   await page.locator('.together-button').click();
  77  |   const dialog = page.getByRole('dialog', { name: 'Together · Your friendship toolkit' });
  78  |   await expect(dialog).toBeVisible();
  79  |   await dialog.getByRole('button', { name: 'Make memories', exact: true }).click();
  80  |   await expect(dialog.locator('.friendship-feature-card')).toHaveCount(4);
  81  |   await dialog.getByRole('button', { name: 'All', exact: true }).click();
  82  |   await dialog.getByLabel('Search friendship features').fill('starred');
  83  |   await expect(dialog.locator('.friendship-feature-card')).toHaveCount(1);
  84  |   await dialog.getByRole('button', { name: /Starred messages/ }).click();
  85  |   await expect(dialog).not.toBeVisible();
  86  |   await expect(page.getByRole('dialog')).toBeVisible();
  87  |   await page.getByRole('button', { name: 'Close', exact: true }).click();
  88  |   await page.locator('.together-button').click();
  89  |   await page.getByLabel('Search friendship features').fill('no-such-feature');
  90  |   await expect(page.getByRole('heading', { name: 'No features found' })).toBeVisible();
  91  |   await page.getByRole('button', { name: 'Show all features' }).click();
  92  |   await expect(page.locator('.friendship-feature-card')).toHaveCount(28);
  93  |   await page.screenshot({ path: `${artifacts}/desktop-toolkit.png` });
  94  |   expect(errors).toEqual([]);
  95  | });
  96  | 
  97  | test('mobile chat, Together navigation, and dark theme fit the viewport', async ({ page }) => {
  98  |   await page.setViewportSize({ width: 390, height: 844 });
  99  |   await setupPrivacy(page);
  100 |   await expect(page.getByLabel('Message', { exact: true })).toBeVisible();
  101 |   await expect(page.getByRole('button', { name: 'Send message', exact: true })).toBeVisible();
  102 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  103 |   await page.screenshot({ path: `${artifacts}/mobile-chat.png` });
  104 |   await page.locator('.together-button').click();
  105 |   await expect(page.getByLabel('Search friendship features')).toBeVisible();
  106 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  107 |   await page.screenshot({ path: `${artifacts}/mobile-toolkit.png` });
  108 |   await page.getByRole('button', { name: 'Close', exact: true }).click();
  109 |   await page.getByRole('button', { name: 'Back to chats', exact: true }).click();
  110 |   await page.getByRole('button', { name: 'Unread', exact: true }).click();
  111 |   await expect(page.getByText('No unread conversations yet.')).toBeVisible();
  112 |   await page.getByRole('button', { name: 'All', exact: true }).click();
  113 |   await expect(page.locator('.conversation')).toHaveCount(1);
  114 |   await page.getByRole('button', { name: 'Together', exact: true }).click();
  115 |   await expect(page.getByRole('heading', { name: 'More ways to be there.' })).toBeVisible();
  116 |   await expect(page.getByRole('button', { name: /Choose a conversation to begin/ }).first()).toBeDisabled();
  117 |   await page.getByRole('button', { name: /Switch to dark theme/ }).click();
  118 |   await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  119 |   await page.screenshot({ path: `${artifacts}/mobile-together-dark.png` });
  120 | });
  121 | 
  122 | test('signed-out experience and empty workspace remain useful at desktop size', async ({ page }) => {
  123 |   await page.setViewportSize({ width: 1512, height: 982 });
  124 |   await page.route('**/api/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(new URL(route.request().url()).pathname.endsWith('/session') ? { user: null, csrf: 'test' } : { registration: true }) }));
  125 |   await page.goto('/');
  126 |   await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  127 |   await page.screenshot({ path: `${artifacts}/desktop-auth.png` });
  128 |   await page.getByRole('button', { name: 'Create an account' }).click();
  129 |   await expect(page.getByLabel('Username', { exact: true })).toBeVisible();
  130 |   await page.setViewportSize({ width: 390, height: 844 });
  131 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  132 |   await page.screenshot({ path: `${artifacts}/mobile-register.png`, fullPage: true });
  133 |   await page.unroute('**/api/**');
  134 |   await page.setViewportSize({ width: 1512, height: 982 });
  135 |   await setupPrivacy(page);
  136 |   await page.locator('.rail-items').getByRole('button', { name: 'Together', exact: true }).click();
  137 |   await page.screenshot({ path: `${artifacts}/desktop-together.png` });
  138 | });
  139 | 
```