/**
 * Offline Manager for MyKipenzi
 * Handles offline message queueing, retry logic, and sync
 */

import { api } from './api.js';

const DB_NAME = 'kipenzi-offline';
const DB_VERSION = 1;
const STORE_MESSAGES = 'pending_messages';
const STORE_MEDIA = 'pending_media';
const STORE_SYNC = 'sync_queue';

class OfflineManager {
  constructor() {
    this.db = null;
    this.isOnline = navigator.onLine;
    this.retryInterval = null;
    this.listeners = new Set();
    this.init();
  }

  async init() {
    // Setup online/offline event listeners
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Initialize IndexedDB
    try {
      this.db = await this.openDatabase();
      console.log('Offline manager initialized');
    } catch (error) {
      console.error('Failed to initialize offline manager:', error);
    }

    // Start retry loop if online
    if (this.isOnline) {
      this.startRetryLoop();
    }
  }

  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Pending messages store
        if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
          const messageStore = db.createObjectStore(STORE_MESSAGES, {
            keyPath: 'id',
            autoIncrement: true,
          });
          messageStore.createIndex('conversation_id', 'conversation_id', { unique: false });
          messageStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // Pending media uploads
        if (!db.objectStoreNames.contains(STORE_MEDIA)) {
          const mediaStore = db.createObjectStore(STORE_MEDIA, {
            keyPath: 'id',
            autoIncrement: true,
          });
          mediaStore.createIndex('created_at', 'created_at', { unique: false });
        }

        // Generic sync queue
        if (!db.objectStoreNames.contains(STORE_SYNC)) {
          const syncStore = db.createObjectStore(STORE_SYNC, {
            keyPath: 'id',
            autoIncrement: true,
          });
          syncStore.createIndex('created_at', 'created_at', { unique: false });
        }
      };
    });
  }

  handleOnline() {
    console.log('Connection restored');
    this.isOnline = true;
    this.notifyListeners({ type: 'online' });
    this.startRetryLoop();
    this.syncPendingItems();
  }

  handleOffline() {
    console.log('Connection lost');
    this.isOnline = false;
    this.notifyListeners({ type: 'offline' });
    this.stopRetryLoop();
  }

  startRetryLoop() {
    if (this.retryInterval) return;
    
    this.retryInterval = setInterval(() => {
      if (this.isOnline) {
        this.syncPendingItems();
      }
    }, 10000); // Retry every 10 seconds
  }

  stopRetryLoop() {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
  }

  // Queue message for sending when back online
  async queueMessage(conversationId, messageData) {
    if (!this.db) throw new Error('Database not initialized');

    const item = {
      conversation_id: conversationId,
      data: messageData,
      created_at: Date.now(),
      retry_count: 0,
      status: 'pending',
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_MESSAGES], 'readwrite');
      const store = tx.objectStore(STORE_MESSAGES);
      const request = store.add(item);

      request.onsuccess = () => {
        item.id = request.result;
        this.notifyListeners({ type: 'message_queued', data: item });
        resolve(item);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get all pending messages for a conversation
  async getPendingMessages(conversationId) {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_MESSAGES], 'readonly');
      const store = tx.objectStore(STORE_MESSAGES);
      const index = store.index('conversation_id');
      const request = index.getAll(conversationId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Sync all pending items
  async syncPendingItems() {
    if (!this.db || !this.isOnline) return;

    try {
      // Sync pending messages
      const messages = await this.getAllPending(STORE_MESSAGES);
      for (const item of messages) {
        await this.retryMessage(item);
      }

      // Sync pending media
      const media = await this.getAllPending(STORE_MEDIA);
      for (const item of media) {
        await this.retryMedia(item);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  async getAllPending(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async retryMessage(item) {
    try {
      // Attempt to send message
      await api(`/conversations/${item.conversation_id}/messages`, {
        method: 'POST',
        body: item.data,
      });

      // Success - remove from queue
      await this.removeFromQueue(STORE_MESSAGES, item.id);
      this.notifyListeners({ type: 'message_sent', data: item });
    } catch (error) {
      console.error('Retry message failed:', error);

      // Update retry count
      await this.updateRetryCount(STORE_MESSAGES, item.id);

      // If too many retries, mark as failed
      if (item.retry_count >= 5) {
        await this.markAsFailed(STORE_MESSAGES, item.id);
        this.notifyListeners({ type: 'message_failed', data: item, error });
      }
    }
  }

  async retryMedia(item) {
    try {
      const formData = new FormData();
      formData.append('file', item.file);

      const result = await api(`/conversations/${item.conversation_id}/uploads`, {
        method: 'POST',
        body: formData,
        headers: {},
      });

      await this.removeFromQueue(STORE_MEDIA, item.id);
      this.notifyListeners({ type: 'media_uploaded', data: item, result });
    } catch (error) {
      console.error('Retry media failed:', error);
      await this.updateRetryCount(STORE_MEDIA, item.id);

      if (item.retry_count >= 3) {
        await this.markAsFailed(STORE_MEDIA, item.id);
        this.notifyListeners({ type: 'media_failed', data: item, error });
      }
    }
  }

  async removeFromQueue(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateRetryCount(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.retry_count = (item.retry_count || 0) + 1;
          item.last_retry = Date.now();
          store.put(item);
        }
        resolve();
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async markAsFailed(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.status = 'failed';
          store.put(item);
        }
        resolve();
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Download conversation for offline access
  async downloadConversation(conversationId, messageLimit = 100) {
    if (!this.isOnline) {
      throw new Error('Cannot download while offline');
    }

    try {
      const messages = await api(`/conversations/${conversationId}/messages?limit=${messageLimit}`);
      
      // Store in IndexedDB or cache
      await this.cacheConversationData(conversationId, messages);
      
      this.notifyListeners({
        type: 'conversation_downloaded',
        conversationId,
        messageCount: messages.messages?.length || 0,
      });
    } catch (error) {
      console.error('Download conversation failed:', error);
      throw error;
    }
  }

  async cacheConversationData(conversationId, data) {
    // Store in Cache API for offline access
    if ('caches' in window) {
      const cache = await caches.open('kipenzi-conversations');
      const response = new Response(JSON.stringify(data));
      await cache.put(`/conversations/${conversationId}/offline`, response);
    }
  }

  async getCachedConversation(conversationId) {
    if ('caches' in window) {
      const cache = await caches.open('kipenzi-conversations');
      const response = await cache.match(`/conversations/${conversationId}/offline`);
      if (response) {
        return await response.json();
      }
    }
    return null;
  }

  // Event listener management
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event) {
    this.listeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  // Get offline status
  getStatus() {
    return {
      isOnline: this.isOnline,
      hasPendingMessages: false, // Can be enhanced
      hasPendingMedia: false,
    };
  }
}

// Singleton instance
export const offlineManager = new OfflineManager();

// React hook for offline status
export function useOfflineStatus() {
  const [status, setStatus] = useState({
    isOnline: navigator.onLine,
    pendingCount: 0,
  });

  useEffect(() => {
    const updateStatus = (event) => {
      setStatus({
        isOnline: event.type === 'online' || offlineManager.isOnline,
        pendingCount: 0, // Can be enhanced
      });
    };

    const removeListener = offlineManager.addListener(updateStatus);
    
    return removeListener;
  }, []);

  return status;
}

// Offline indicator component
export function OfflineIndicator() {
  const status = useOfflineStatus();

  if (status.isOnline) return null;

  return (
    <div className="offline-indicator">
      <div className="offline-banner">
        <span className="offline-icon">📡</span>
        <span>No internet connection</span>
        {status.pendingCount > 0 && (
          <span className="pending-count">
            {status.pendingCount} message{status.pendingCount !== 1 ? 's' : ''} queued
          </span>
        )}
      </div>
    </div>
  );
}

export default offlineManager;
