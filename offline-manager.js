// Offline Manager - Handles caching and offline functionality
class OfflineManager {
  constructor() {
    this.DB_NAME = 'JambGeniusDB';
    this.QUESTIONS_STORE = 'questions';
    this.RESULTS_STORE = 'results';
    this.SYNC_QUEUE_STORE = 'syncQueue';
    this.db = null;
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    
    this.init();
  }

  async init() {
    // Initialize IndexedDB for offline storage
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains(this.QUESTIONS_STORE)) {
          db.createObjectStore(this.QUESTIONS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(this.RESULTS_STORE)) {
          db.createObjectStore(this.RESULTS_STORE, { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains(this.SYNC_QUEUE_STORE)) {
          db.createObjectStore(this.SYNC_QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  // Cache questions for offline access
  async cacheQuestions(subject, questions) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.QUESTIONS_STORE, 'readwrite');
      const store = tx.objectStore(this.QUESTIONS_STORE);
      
      questions.forEach(q => {
        q.cachedAt = new Date().toISOString();
        q.subject = subject;
        store.put(q);
      });
      
      tx.oncomplete = () => {
        console.log(`Cached ${questions.length} questions for ${subject}`);
        this.updateOfflineIndicator();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  // Get cached questions for a subject
  async getCachedQuestions(subject) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.QUESTIONS_STORE, 'readonly');
      const store = tx.objectStore(this.QUESTIONS_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const questions = request.result.filter(q => q.subject === subject);
        resolve(questions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get all cached questions
  async getAllCachedQuestions() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.QUESTIONS_STORE, 'readonly');
      const store = tx.objectStore(this.QUESTIONS_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Save exam result locally (for sync later)
  async saveResultLocally(result) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.RESULTS_STORE, 'readwrite');
      const store = tx.objectStore(this.RESULTS_STORE);
      
      result.savedAt = new Date().toISOString();
      result.synced = false;
      
      const request = store.add(result);
      
      request.onsuccess = () => {
        console.log('Result saved locally:', result.score);
        this.addToSyncQueue('result', result);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Add item to sync queue
  async addToSyncQueue(type, data) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.SYNC_QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(this.SYNC_QUEUE_STORE);
      
      const queueItem = {
        type: type,
        data: data,
        timestamp: new Date().toISOString(),
        attempts: 0
      };
      
      const request = store.add(queueItem);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get sync queue
  async getSyncQueue() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.SYNC_QUEUE_STORE, 'readonly');
      const store = tx.objectStore(this.SYNC_QUEUE_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Remove from sync queue after successful sync
  async removeFromSyncQueue(id) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.SYNC_QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(this.SYNC_QUEUE_STORE);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Sync offline data when back online
  async syncData() {
    if (this.syncInProgress || !this.isOnline) return;
    
    this.syncInProgress = true;
    this.updateOfflineIndicator('syncing');
    
    try {
      const queue = await this.getSyncQueue();
      
      for (const item of queue) {
        try {
          await this.syncQueueItem(item);
          await this.removeFromSyncQueue(item.id);
        } catch (error) {
          console.error('Failed to sync item:', error);
          // Don't remove from queue if sync fails
        }
      }
      
      this.updateOfflineIndicator();
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync individual queue item
  async syncQueueItem(item) {
    if (item.type === 'result') {
      const response = await fetch('/api/save-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data)
      });
      
      if (!response.ok) throw new Error('Sync failed');
      return response.json();
    }
  }

  // Update offline indicator in UI
  updateOfflineIndicator(status = null) {
    const indicator = document.getElementById('offline-indicator');
    if (!indicator) return;
    
    if (this.isOnline) {
      indicator.style.display = 'none';
    } else {
      indicator.style.display = 'flex';
      indicator.innerHTML = status === 'syncing' 
        ? '📡 Syncing offline data...' 
        : '📵 Offline Mode - Changes will sync when online';
    }
  }

  // Setup offline/online listeners
  setupOfflineListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('Back online');
      this.updateOfflineIndicator();
      this.syncData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('Went offline');
      this.updateOfflineIndicator();
    });
  }

  // Get offline storage stats
  async getOfflineStats() {
    if (!this.db) await this.init();
    
    const questions = await this.getAllCachedQuestions();
    const syncQueue = await this.getSyncQueue();
    
    return {
      cachedQuestionsCount: questions.length,
      pendingSyncCount: syncQueue.length,
      totalSize: JSON.stringify(questions).length + JSON.stringify(syncQueue).length
    };
  }

  // Clear offline data
  async clearOfflineData() {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.QUESTIONS_STORE, this.RESULTS_STORE], 'readwrite');
      
      tx.objectStore(this.QUESTIONS_STORE).clear();
      tx.objectStore(this.RESULTS_STORE).clear();
      
      tx.oncomplete = () => {
        console.log('Offline data cleared');
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }
}

// Initialize global instance
const offlineManager = new OfflineManager();
offlineManager.setupOfflineListeners();
