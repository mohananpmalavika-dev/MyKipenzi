import { test, expect } from '@playwright/test';

test('reply, edit, and delete a sent message', async ({ page, browser }) => {
  const suffix = Date.now().toString();
  const friend = await browser.newContext();
  try {
    const register = async (client, handle) => {
      const response = await client.post('/api/auth/register', { headers: { origin: 'http://localhost:5173' }, data: { handle, name: handle, email: handle + '@example.test', password: 'a long strong password', language: 'en', ai_consent: false } });
      expect(response.status()).toBe(201);
      return response.json();
    };
    const sender = await register(page.request, 'sender_' + suffix);
    const receiverResponse = await friend.request.post('http://localhost:5173/api/auth/register', { headers: { origin: 'http://localhost:5173' }, data: { handle: 'friend_' + suffix, name: 'Friend', email: 'friend_' + suffix + '@example.test', password: 'a long strong password', language: 'en', ai_consent: false } });
    expect(receiverResponse.status()).toBe(201);
    const receiver = await receiverResponse.json();
    const conversationResponse = await page.request.post('/api/conversations', { headers: { origin: 'http://localhost:5173', 'x-csrf-token': sender.csrf }, data: { handle: receiver.user.handle } });
    const conversation = await conversationResponse.json();
    await page.goto('/?chat=' + conversation.id + '&account=' + sender.user.id);
    await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Original message');
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    const original = page.locator('article.message').filter({ has: page.locator('.bubble > p', { hasText: /^Original message$/ }) });
    await expect(original).toBeVisible();
    const history = await page.request.get('/api/conversations/' + conversation.id + '/messages');
    const saved = (await history.json()).messages[0];
    await page.route('**/api/conversations/*/library?*', route => {
      const url = new URL(route.request().url());
      const matches = (!url.searchParams.get('q') || saved.text.toLowerCase().includes(url.searchParams.get('q').toLowerCase())) && url.searchParams.get('kind') === 'messages';
      return route.fulfill({ json: { messages: matches ? [saved] : [], has_more: false } });
    });
    await page.getByRole('button', { name: 'Search this chat', exact: true }).click();
    await page.getByRole('textbox', { name: 'Search chat history' }).fill('Original');
    await expect(page.locator('.library-item')).toContainText('Original message');
    await page.getByRole('button', { name: 'Documents', exact: true }).click();
    await expect(page.getByText('No matching items in this chat.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Messages', exact: true }).click();
    await page.getByRole('button', { name: 'View in chat', exact: true }).click();
    await expect(original).toHaveClass(/message-highlight/);
    await original.getByRole('button', { name: 'Reply', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Cancel reply' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Message', exact: true }).fill('Specific reply');
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
    await expect(page.locator('blockquote.quoted-reply')).toContainText('Original message');
    await original.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('textbox', { name: 'Edit message', exact: true }).fill('Edited message');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.locator('blockquote.quoted-reply')).toContainText('Edited message');
    const edited = page.locator('article.message').filter({ has: page.locator('.bubble > p', { hasText: /^Edited message$/ }) });
    await edited.getByRole('button', { name: 'Delete', exact: true }).click();
    await edited.getByRole('button', { name: 'Delete for everyone', exact: true }).click();
    await expect(page.locator('blockquote.quoted-reply')).toContainText('Message deleted');
    await expect(page.locator('.bubble > p').filter({ hasText: /^Message deleted$/ })).toBeVisible();
  } finally { await friend.close(); }
});
