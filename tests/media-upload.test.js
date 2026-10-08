import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setCsrf, uploadFile } from '../src/api.js';

test('uploads report real progress, use CSRF, and handle retry after failure', async () => {
  const original = globalThis.XMLHttpRequest;
  const requests = [];
  globalThis.XMLHttpRequest = class {
    upload = {};
    headers = {};
    constructor() { requests.push(this); }
    open(method, url) { this.method = method; this.url = url; }
    setRequestHeader(key, value) { this.headers[key] = value; }
    send(body) { this.body = body; }
  };
  try {
    setCsrf('token');
    const progress = [];
    const body = new FormData();
    body.append('file', new Blob(['photo']), 'photo.png');
    const failed = uploadFile('/conversations/chat/uploads', body, value => progress.push(value));
    const first = requests[0];
    assert.equal(first.headers['x-csrf-token'], 'token');
    assert.equal(first.url, '/api/conversations/chat/uploads');
    assert.equal(first.body, body);
    first.upload.onprogress({ lengthComputable: true, loaded: 5, total: 10 });
    assert.deepEqual(progress, [0, 50]);
    first.onerror();
    await assert.rejects(failed, /retry/);
    const retry = uploadFile('/conversations/chat/uploads', body, value => progress.push(value));
    const second = requests[1];
    second.status = 201;
    second.responseText = JSON.stringify({ id: 'attachment' });
    second.onload();
    assert.deepEqual(await retry, { id: 'attachment' });
    const invalid = uploadFile('/conversations/chat/uploads', body, () => {});
    requests[2].status = 502;
    requests[2].responseText = '<html>Bad gateway</html>';
    requests[2].onload();
    await assert.rejects(invalid, /service could not be reached/);
  } finally { globalThis.XMLHttpRequest = original; setCsrf(null); }
});
