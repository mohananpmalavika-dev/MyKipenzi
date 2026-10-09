// A configured decoy must not be exposed by background notification previews.
export function privateNotifications(record) {
  return Boolean(record?.decoyPin || record?.privacyMode);
}
export async function readNotificationPrivacy(userId, storage = globalThis.indexedDB) {
  if (!storage) return true;
  return new Promise(resolve => {
    const request = storage.open('kipenzi-app-lock', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('settings')) request.result.createObjectStore('settings');
    };
    request.onerror = request.onblocked = () => resolve(true);
    request.onsuccess = () => {
      const database = request.result;
      try {
        const transaction = database.transaction('settings', 'readonly');
        const operation = transaction.objectStore('settings').get(userId);
        transaction.oncomplete = () => { database.close(); resolve(privateNotifications(operation.result)); };
        transaction.onerror = transaction.onabort = () => { database.close(); resolve(true); };
      } catch { database.close(); resolve(true); }
    };
  });
}
