import { pinRecord } from '../../src/appLockSecurity.js';
export const me = '11111111-1111-4111-8111-111111111111';
export const peer = '22222222-2222-4222-8222-222222222222';
export const cid = '33333333-3333-4333-8333-333333333333';
export const mediaId = '44444444-4444-4444-8444-444444444444';
export const alertId = '55555555-5555-4555-8555-555555555555';
const pixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
export async function setupPrivacy(page, options = {}) {
  const user = { id: me, name: 'Dhanya', handle: 'dhanya', language: options.language || 'en', ai_consent: false };
  const reports = [], history = [];
  let conversationReads = 0, socket;
  await page.routeWebSocket('**/socket.io/**', ws => {
    socket = ws;
    ws.send('0' + JSON.stringify({ sid: 'privacy-test', upgrades: [], pingInterval: 25000, pingTimeout: 20000, maxPayload: 1000000 }));
    ws.onMessage(message => {
      if (String(message).startsWith('40')) ws.send('40' + JSON.stringify({ sid: 'privacy-test' }));
      if (message === '2') ws.send('3');
    });
  });
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url()), p = url.pathname;
    let data = {};
    if (p === '/api/auth/session') data = { user, csrf: 'test' };
    else if (p === '/api/conversations') {
      conversationReads++;
      data = [{ id: cid, is_group: false, read_seq: 0, unread: 0, peer: { id: peer, name: 'My Person', handle: 'my_person', language: 'en' }, peer_read_seq: 0 }];
    } else if (p.endsWith('/moods')) data = { statuses: [] };
    else if (p.endsWith('/messages')) data = { messages: options.media ? [{
      id: mediaId, conversation_id: cid, sender_id: peer, sender: { id: peer, name: 'My Person' }, client_id: mediaId, seq: '1',
      text: '', source_language: 'en', created_at: new Date().toISOString(), view_once: true,
      attachment: { id: mediaId, mime: 'image/png', name: 'private.png', size: 100 },
    }] : options.messages || [], has_more: false };
    else if (p.endsWith('/view-once')) return route.fulfill({ body: Buffer.from(pixel, 'base64'), contentType: 'image/png' });
    else if (p.endsWith('/capture-alerts')) {
      if (route.request().method() === 'POST') {
        const input = route.request().postDataJSON();
        reports.push(input);
        if (options.failCapture && reports.length === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Offline' }) });
        const alert = { ...input, id: alertId, conversation_id: cid, sender_id: me, sender_name: 'Dhanya', context: input.message_id ? 'view_once' : 'chat', created_at: new Date().toISOString() };
        history.unshift(alert); data = { alert };
      } else data = { alerts: history };
    } else if (p.startsWith('/api/capture-alerts/')) data = {
      id: alertId, conversation_id: cid, sender_id: peer, sender_name: 'My Person', kind: 'screenshot_shortcut', context: 'chat', created_at: new Date().toISOString(),
    };
    else if (p.endsWith('/calls/current')) data = null;
    else if (p.endsWith('/calls') || p.endsWith('/drafts')) data = [];
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto(`/?chat=${cid}&account=${me}`);
  return {
    reports, reads: () => conversationReads, connected: () => !!socket,
    partnerAlert: () => socket.send('42' + JSON.stringify(['privacy:capture', { id: alertId, sender_id: peer, conversation_id: cid }])),
  };
}
export async function seedLock(page, decoy = true) {
  const record = { pin: await pinRecord('123456'), decoyPin: decoy ? await pinRecord('654321') : null,
    failures: 0, retryAt: 0, autoLockMinutes: 0, privacyMode: false };
  await page.evaluate(({ me, record }) => new Promise((resolve, reject) => {
    const request = indexedDB.open('kipenzi-app-lock', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('settings');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('settings', 'readwrite');
      transaction.objectStore('settings').put(record, me);
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => { database.close(); reject(transaction.error); };
    };
  }), { me, record });
  await page.goto(`/?chat=${cid}&account=${me}`);
}
export async function enterPin(page, pin) {
  await page.getByLabel('6-digit PIN', { exact: true }).fill(pin);
  await page.getByRole('button', { name: 'Unlock with PIN', exact: true }).click();
}

export async function readLock(page) {
  return page.evaluate(me => new Promise((resolve, reject) => {
    const request = indexedDB.open('kipenzi-app-lock', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('settings', 'readonly');
      const operation = transaction.objectStore('settings').get(me);
      transaction.oncomplete = () => { database.close(); resolve(operation.result); };
      transaction.onerror = () => { database.close(); reject(transaction.error); };
    };
  }), me);
}
