import { offlineStore } from '../shared/offline-store.js';

let csrf = null;
export function setCsrf(value) {
  csrf = value;
}
export async function api(path, options = {}) {
  const read = !options.method || options.method === 'GET';
  const cacheable = read && /^\/(conversations(?:\/[\w-]+\/messages(?:\?.*)?)?|messages\/[\w-]+|drafts)$/.test(path);
  const previous = await offlineStore.session().catch(() => null);
  const owner = previous?.user?.id;
  if (path === '/auth/logout') {
    if (owner) await offlineStore.setPendingLogout({ owner });
    await offlineStore.clear();
  }
  let response;
  try {
    if (navigator.onLine === false) throw new TypeError('Offline');
    const pendingLogout = path !== '/auth/logout' && await offlineStore.pendingLogout().catch(() => null);
    if (pendingLogout) {
      const sessionResponse = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(30000) });
      if (!sessionResponse.ok && sessionResponse.status !== 401) throw new Error('Could not finish signing out. Please retry.');
      const current = sessionResponse.status === 401 ? { user: null } : await sessionResponse.json();
      if (current.user?.id === pendingLogout.owner) {
        const logoutResponse = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', signal: AbortSignal.timeout(30000), headers: { 'x-csrf-token': current.csrf } });
        if (!logoutResponse.ok) throw new Error('Could not finish signing out. Please retry.');
      }
      await offlineStore.setPendingLogout(null);
    }
    response = await fetch(`/api${path}`, {
      signal: AbortSignal.timeout(options.body instanceof FormData ? 120000 : 30000),
      ...options,
      credentials: 'same-origin',
      headers: {
        ...(options.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
        ...(csrf ? { 'x-csrf-token': csrf } : {}),
        ...options.headers,
      },
      body:
        options.body instanceof FormData
          ? options.body
          : options.body
            ? JSON.stringify(options.body)
            : undefined,
    });
  } catch (error) {
    if (path === '/auth/logout') return { ok: true };
    if (path === '/auth/session' && await offlineStore.pendingLogout().catch(() => null)) return { user: null, csrf: null };
    if (path === '/auth/session' && previous?.user) return previous;
    if (path === '/capabilities') {
      const features = await offlineStore.features().catch(() => undefined);
      if (features !== undefined) return features;
    }
    if (cacheable && owner) {
      const cached = await offlineStore.read(owner, path).catch(() => undefined);
      if (cached !== undefined) return cached;
    }
    if (navigator.onLine === false) throw new Error(cacheable ? 'This history is not saved on this device yet. Connect to load it.' : 'You’re offline. Connect to use this action.');
    throw error;
  }
  if (!response.headers.get('content-type')?.includes('application/json'))
    throw new Error('The service could not be reached. Please retry.');
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) await offlineStore.clear();
    const error = new Error(data.error || 'Request failed');
    error.status = response.status;
    throw error;
  }
  if (path === '/auth/session' && await offlineStore.pendingLogout().catch(() => null)) return { user: null, csrf: null };
  if (/^\/auth\/(session|login|register)$/.test(path)) await offlineStore.setSession(data).catch(() => {});
  if (path === '/auth/logout') await offlineStore.setPendingLogout(null);
  if (path === '/capabilities') await offlineStore.setFeatures(data).catch(() => {});
  if (cacheable && owner) await offlineStore.cache(owner, path, data).catch(() => {});
  if (/^\/messages\/[\w-]+$/.test(path) && data.id) await offlineStore.updateMessage(owner, data).catch(() => {});
  return data;
}
export async function openViewOnce(id, signal) {
  const response = await fetch('/api/messages/' + id + '/view-once', {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    signal, headers: csrf ? { 'x-csrf-token': csrf } : {},
  });
  if (!response.ok) {
    const data = await response.json();
    const error = new Error(data.error || 'Could not open media.');
    error.status = response.status;
    throw error;
  }
  return response.blob();
}
export async function fileBlob(id, signal) {
  const { url } = await api(`/attachments/${id}`, signal ? { signal } : {});
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('File download failed.');
  return response.blob();
}
export async function downloadFile(attachment) {
  const blob = await fileBlob(attachment.id),
    url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = attachment.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function uploadFile(path, body, onProgress) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', '/api' + path);
    request.timeout = 120000;
    if (csrf) request.setRequestHeader('x-csrf-token', csrf);
    request.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.min(100, Math.round(event.loaded / event.total * 100)));
    };
    request.onerror = () => reject(new Error('Upload failed. Check your connection and retry.'));
    request.ontimeout = () => reject(new Error('Upload timed out. Please retry.'));
    request.onabort = () => reject(new Error('Upload cancelled.'));
    request.onload = () => {
      try {
        const data = JSON.parse(request.responseText);
        if (request.status < 200 || request.status >= 300) {
          const error = new Error(data.error || 'Upload failed. Please retry.');
          error.status = request.status;
          throw error;
        }
        resolve(data);
      } catch (error) { reject(error instanceof SyntaxError ? new Error('The service could not be reached. Please retry.') : error); }
    };
    onProgress(0);
    request.send(body);
  });
}
