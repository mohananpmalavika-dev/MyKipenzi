import { test, expect } from '@playwright/test';
const me = '11111111-1111-4111-8111-111111111111';
const partner = '22222222-2222-4222-8222-222222222222';
const cid = '33333333-3333-4333-8333-333333333333';

async function setup(page, options = {}) {
  const user = { id: me, name: 'Dhanya', handle: 'dhanya', language: 'en', ai_consent: false };
  let statuses = options.statuses || [];
  let writes = 0;
  let socket;
  await page.routeWebSocket('**/socket.io/**', ws => {
    socket = ws;
    ws.send('0' + JSON.stringify({ sid: 'mood-test', upgrades: [], pingInterval: 25000, pingTimeout: 20000, maxPayload: 1000000 }));
    ws.onMessage(message => {
      if (String(message).startsWith('40')) ws.send('40' + JSON.stringify({ sid: 'mood-test' }));
      if (message === '2') ws.send('3');
    });
  });
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;
    let data = {};
    if (pathname === '/api/auth/session') data = { user, csrf: 'test' };
    else if (pathname === '/api/conversations') data = [{
      id: cid, read_seq: 0, unread: 0, is_group: !!options.group, contact_blocked: !!options.blocked,
      members: [user, { id: partner }], peer: { id: partner, name: 'My Person', handle: 'my_person', language: 'ml' }, peer_read_seq: 0,
    }];
    else if (pathname.endsWith('/moods')) {
      if (route.request().method() === 'POST') {
        writes++;
        if (options.fail) return route.fulfill({ status: 503, json: { error: 'Please retry your check-in.' } });
        const mood = route.request().postDataJSON().mood;
        const status = { conversation_id: cid, user_id: me, mood, revision: writes, updated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString() };
        statuses = [...statuses.filter(s => s.user_id !== me), status];
        data = { status, changed: true };
      } else data = { statuses };
    }
    else if (pathname.endsWith('/messages')) data = { messages: [], has_more: false };
    else if (pathname.endsWith('/calls/current')) data = null;
    else if (pathname.endsWith('/calls')) data = [];
    await route.fulfill({ json: data });
  });
  await page.goto(`/?chat=${cid}&account=${me}`);
  return {
    writes: () => writes, connected: () => !!socket,
    partnerMood: (mood, revision) => {
      const status = { conversation_id: cid, user_id: partner, sender_name: 'My Person', mood, revision, updated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString() };
      statuses = [...statuses.filter(s => s.user_id !== partner), status];
      socket.send('42' + JSON.stringify(['mood:changed', status]));
    },
  };
}

test('one tap shares each mood, persists on reload, and avoids repeat sends', async ({ page }) => {
  const state = await setup(page);
  const widget = page.getByRole('region', { name: 'Mood check-in' });
  await expect(widget).toBeVisible();
  await expect(widget).toContainText('No check-in yet');
  for (const mood of ['Happy', 'Tired', 'Missing You', 'Need a Hug']) {
    const button = page.getByRole('button', { name: 'Share mood: ' + mood, exact: true });
    await expect(button).toBeEnabled();
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(widget).toContainText('Shared with My Person');
    await button.click();
  }
  expect(state.writes()).toBe(4);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Share mood: Need a Hug', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(widget).toContainText('Visible for 24 hours');
});

test('failed check-in shows a retryable error without changing the mood', async ({ page }) => {
  await setup(page, { fail: true });
  const button = page.getByRole('button', { name: 'Share mood: Happy', exact: true });
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.getByRole('alert')).toContainText('Please retry your check-in.');
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  await expect(button).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeEnabled();
});

test('mobile and dark mode show both moods without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, { statuses: [
    { user_id: me, mood: 'happy', revision: 1, updated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString() },
    { user_id: partner, mood: 'missing_you', revision: 2, updated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString() },
  ] });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  const widget = page.getByRole('region', { name: 'Mood check-in' });
  await expect(widget).toContainText('My Person');
  await expect(widget).toContainText('Missing You');
  await expect(page.getByRole('button', { name: 'Share mood: Happy', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await widget.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/mood-mobile-dark.png', fullPage: true });
});

test('expired mood clears while the widget remains open', async ({ page }) => {
  await setup(page, { statuses: [{
    user_id: partner, mood: 'tired', revision: 1, updated_at: new Date().toISOString(), expires_at: new Date(Date.now() + 5000).toISOString(),
  }] });
  const widget = page.getByRole('region', { name: 'Mood check-in' });
  await expect(widget.locator('.mood-person').last()).toContainText('Tired');
  await expect(widget.locator('.mood-person').last()).toContainText('No check-in yet', { timeout: 10000 });
});

test('group and blocked chats omit partner check-ins', async ({ page }) => {
  await setup(page, { blocked: true });
  await expect(page.getByRole('heading', { name: 'My Person', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Mood check-in' })).toHaveCount(0);
});

test('partner mood updates live and produces the matching cute alert', async ({ page }) => {
  const state = await setup(page);
  const button = page.getByRole('button', { name: 'Share mood: Happy', exact: true });
  await expect(button).toBeEnabled();
  await expect.poll(state.connected).toBe(true);
  state.partnerMood('need_a_hug', 1);
  const widget = page.getByRole('region', { name: 'Mood check-in' });
  await expect(widget.locator('.mood-person').last()).toContainText('Need a Hug');
  await expect(page.locator('.incoming-message-alert')).toContainText('My Person needs a hug');
  state.partnerMood('happy', 2);
  await expect(widget.locator('.mood-person').last()).toContainText('Happy');
  await expect(page.locator('.incoming-message-alert')).toContainText('feeling happy');
});

test('offline controls disable and recover when connectivity returns', async ({ page }) => {
  await setup(page);
  const button = page.getByRole('button', { name: 'Share mood: Happy', exact: true });
  await expect(button).toBeEnabled();
  await page.context().setOffline(true);
  await expect(button).toBeDisabled();
  await expect(page.getByRole('region', { name: 'Mood check-in' })).toContainText('Connect to share your mood.');
  await page.context().setOffline(false);
  await expect(button).toBeEnabled();
});
