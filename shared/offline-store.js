const DATABASE = 'kipenzi-offline';
let database;
function open() {
  if (!database) database = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      for (const name of ['meta', 'responses', 'outbox']) request.result.createObjectStore(name);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { database = null; reject(request.error); };
  });
  return database;
}
async function transaction(names, mode, work) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(names, mode);
    let result;
    tx.oncomplete = () => resolve(result);
    tx.onerror = tx.onabort = () => reject(tx.error || new Error('Offline storage failed.'));
    work(tx, value => { result = value; });
  });
}
// Expiring messages and quoted replies must expire even without a connection.
export function pruneExpired(value, now = Date.now()) {
  if (Array.isArray(value)) return value.map(item => pruneExpired(item, now)).filter(item => item !== null);
  if (!value || typeof value !== 'object') return value;
  if (value.expires_at && new Date(value.expires_at).getTime() <= now) return null;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, pruneExpired(item, now)]));
}
export const offlineStore = {
  pendingLogout: () => transaction(['meta'], 'readonly', (tx, done) => {
    tx.objectStore('meta').get('logout').onsuccess = event => done(event.target.result);
  }),
  setPendingLogout: value => transaction(['meta'], 'readwrite', tx => {
    if (value) tx.objectStore('meta').put(value, 'logout');
    else tx.objectStore('meta').delete('logout');
  }),
  features: () => transaction(['meta'], 'readonly', (tx, done) => {
    tx.objectStore('meta').get('capabilities').onsuccess = event => done(event.target.result);
  }),
  setFeatures: data => transaction(['meta'], 'readwrite', tx => tx.objectStore('meta').put(data, 'capabilities')),
  session: () => transaction(['meta'], 'readonly', (tx, done) => {
    tx.objectStore('meta').get('session').onsuccess = event => done(event.target.result);
  }),
  setSession: session => transaction(['meta', 'responses', 'outbox'], 'readwrite', tx => {
    const meta = tx.objectStore('meta');
    meta.get('session').onsuccess = event => {
      if (event.target.result?.user?.id !== session?.user?.id || !session?.user) {
        tx.objectStore('responses').clear();
        tx.objectStore('outbox').clear();
      }
      meta.put(session, 'session');
    };
  }),
  clear: () => offlineStore.setSession({ user: null, csrf: null }),
  read: (owner, path) => transaction(['responses', 'meta'], 'readonly', (tx, done) => {
    tx.objectStore('meta').get('session').onsuccess = event => {
      if (event.target.result?.user?.id !== owner) return;
      tx.objectStore('responses').get(`${owner}:${path}`).onsuccess = event => done(pruneExpired(event.target.result?.data) ?? undefined);
    };
  }),
  paths: owner => transaction(['responses', 'meta'], 'readonly', (tx, done) => {
    tx.objectStore('meta').get('session').onsuccess = event => {
      if (event.target.result?.user?.id !== owner) return done([]);
      const store = tx.objectStore('responses');
      store.getAllKeys().onsuccess = keysEvent => {
        const keys = keysEvent.target.result;
        store.getAll().onsuccess = rowsEvent => done(rowsEvent.target.result
          .map((row, index) => ({ key: keys[index], time: row.savedAt }))
          .filter(row => row.key.startsWith(`${owner}:`)).sort((a, b) => b.time - a.time)
          .map(row => row.key.slice(owner.length + 1)));
      };
    };
  }),
  cache: (owner, path, data) => transaction(['responses', 'meta'], 'readwrite', tx => {
    tx.objectStore('meta').get('session').onsuccess = event => {
      if (!owner || event.target.result?.user?.id !== owner) return;
      const store = tx.objectStore('responses');
      store.put({ data: pruneExpired(data), savedAt: Date.now() }, `${owner}:${path}`);
      // Bound private history storage to the most recently read 200 pages.
      store.getAllKeys().onsuccess = keysEvent => {
        const keys = keysEvent.target.result;
        if (keys.length <= 200) return;
        store.getAll().onsuccess = rowsEvent => {
          rowsEvent.target.result.map((row, index) => ({ key: keys[index], time: row.savedAt }))
            .filter(row => row.key !== `${owner}:/conversations`)
            .sort((a, b) => a.time - b.time).slice(0, keys.length - 200).forEach(row => store.delete(row.key));
        };
      };
    };
  }),
  updateMessage: (owner, message, append = false) => transaction(['responses', 'meta'], 'readwrite', tx => {
    tx.objectStore('meta').get('session').onsuccess = event => {
      if (event.target.result?.user?.id !== owner) return;
      const store = tx.objectStore('responses');
      const replace = value => {
        if (Array.isArray(value)) return value.map(replace);
        if (!value || typeof value !== 'object') return value;
        if (value.id === message.id) return { ...value, ...message };
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replace(item)]));
      };
      store.openCursor().onsuccess = event => {
        const cursor = event.target.result;
        if (!cursor) return;
        const data = replace(cursor.value.data);
        if (append && cursor.key === `${owner}:/conversations/${message.conversation_id}/messages` && data?.messages && !data.messages.some(row => row.id === message.id)) {
          data.messages.push(message);
          data.messages.sort((a, b) => Number(a.seq) - Number(b.seq));
        }
        cursor.update({ ...cursor.value, data: pruneExpired(data) });
        cursor.continue();
      };
    };
  }),
  list: owner => transaction(['outbox', 'meta'], 'readonly', (tx, done) => {
    tx.objectStore('meta').get('session').onsuccess = event => {
      if (event.target.result?.user?.id !== owner) return done([]);
      tx.objectStore('outbox').getAll().onsuccess = event => done(event.target.result.filter(row => row.owner === owner).sort((a, b) => a.createdAt - b.createdAt));
    };
  }),
  put: entry => transaction(['outbox', 'meta'], 'readwrite', (tx, done) => {
    tx.objectStore('meta').get('session').onsuccess = event => {
      if (event.target.result?.user?.id !== entry.owner) return done(false);
      tx.objectStore('outbox').put(entry, entry.input.client_id);
      done(true);
    };
  }),
  remove: key => transaction(['outbox'], 'readwrite', tx => tx.objectStore('outbox').delete(key)),
  claim: (owner, key) => transaction(['outbox', 'meta'], 'readwrite', (tx, done) => {
    tx.objectStore('meta').get('session').onsuccess = event => {
      if (event.target.result?.user?.id !== owner) return;
      const store = tx.objectStore('outbox');
      store.get(key).onsuccess = event => {
        const entry = event.target.result;
        if (!entry || entry.owner !== owner || entry.leaseUntil > Date.now()) return;
        entry.leaseUntil = Date.now() + 180000;
        entry.status = 'sending';
        store.put(entry, key);
        done(entry);
      };
    };
  }),
};
