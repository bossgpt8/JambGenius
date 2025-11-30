// Offline Exam Integration - Caches exam questions and handles offline practice
class OfflineExamIntegration {
  constructor() {
    this.init();
  }

  async init() {
    // Wait for offlineManager to be ready
    if (typeof offlineManager === 'undefined') {
      setTimeout(() => this.init(), 100);
      return;
    }
    
    console.log('Offline exam integration loaded');
  }

  // Cache exam questions when loaded
  async cacheExamQuestions(subject, questions) {
    try {
      await offlineManager.cacheQuestions(subject, questions);
      console.log(`Cached ${questions.length} questions for ${subject}`);
      this.showCacheNotification(`📦 ${questions.length} questions cached for offline access`);
    } catch (error) {
      console.error('Failed to cache questions:', error);
    }
  }

  // Get questions - use offline if available
  async getQuestionsWithFallback(subject, onlineLoader) {
    if (navigator.onLine) {
      try {
        // Try to load online first
        const questions = await onlineLoader();
        // Cache them while we're here
        await this.cacheExamQuestions(subject, questions);
        return questions;
      } catch (error) {
        console.warn('Failed to load online, checking cache...', error);
        // Fall back to cache if online load fails
        return await offlineManager.getCachedQuestions(subject);
      }
    } else {
      // Offline - use cache
      const cached = await offlineManager.getCachedQuestions(subject);
      if (cached.length === 0) {
        throw new Error('No offline questions available for ' + subject);
      }
      this.showOfflineNotification(`📱 Using ${cached.length} cached questions`);
      return cached;
    }
  }

  // Save exam result with offline support
  async saveExamResultWithOfflineSupport(result) {
    try {
      if (navigator.onLine) {
        // Save to server
        const response = await fetch('/api/save-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result)
        });
        
        if (!response.ok) throw new Error('Server save failed');
        console.log('Result saved to server');
        return response.json();
      } else {
        // Save locally for later sync
        const id = await offlineManager.saveResultLocally(result);
        this.showOfflineNotification('📱 Result saved locally - will sync when online');
        return { id, local: true };
      }
    } catch (error) {
      // Fallback to local save
      console.warn('Failed to save online, saving locally...', error);
      const id = await offlineManager.saveResultLocally(result);
      this.showOfflineNotification('📱 Result saved locally - will sync when online');
      return { id, local: true };
    }
  }

  // Show notification
  showCacheNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // Show offline notification
  showOfflineNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 left-4 bg-amber-500 text-white px-4 py-3 rounded-lg shadow-lg z-50';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  // Get offline stats
  async getOfflineStats() {
    return await offlineManager.getOfflineStats();
  }

  // Clear offline data
  async clearOfflineData() {
    await offlineManager.clearOfflineData();
    this.showCacheNotification('✓ Offline data cleared');
  }

  // Show offline storage settings
  async showOfflineSettings() {
    const stats = await this.getOfflineStats();
    const sizeInMB = (stats.totalSize / 1024 / 1024).toFixed(2);
    
    return {
      cachedQuestions: stats.cachedQuestionsCount,
      pendingSync: stats.pendingSyncCount,
      storageSize: `${sizeInMB} MB`
    };
  }
}

// Initialize global instance
const offlineExamIntegration = new OfflineExamIntegration();
window.offlineExamIntegration = offlineExamIntegration;
