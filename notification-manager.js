// Notification Manager - Manage push notifications for the app
class NotificationManager {
  constructor() {
    this.fcmToken = null;
    this.preferences = {
      reminders: true,
      chat: true,
      exams: true,
      streaks: true
    };
    this.init();
  }

  async init() {
    console.log('📱 Initializing Notification Manager');
    
    // Load preferences from localStorage
    const savedPrefs = localStorage.getItem('notificationPreferences');
    if (savedPrefs) {
      this.preferences = JSON.parse(savedPrefs);
    }

    // Check if running on mobile app
    if (this.isApp()) {
      this.setupAppNotifications();
    }
  }

  // Check if running in the mobile app
  isApp() {
    return navigator.userAgent.includes('JambGeniusApp') || 
           window.location.hostname === 'localhost' && window.location.port === '8080';
  }

  // Setup notifications for the app
  async setupAppNotifications() {
    console.log('🚀 Setting up app notifications');
    
    try {
      // Get FCM token from server (in production)
      this.registerWithServer();
    } catch (error) {
      console.error('Error setting up app notifications:', error);
    }
  }

  // Register device with server
  async registerWithServer() {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) return;

      const response = await fetch('/api/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register-token',
          userId: userId,
          fcmToken: 'app-token-' + userId + '-' + Date.now()
        })
      });

      const data = await response.json();
      if (data.success) {
        console.log('✅ Device registered for notifications');
      }
    } catch (error) {
      console.error('Error registering with server:', error);
    }
  }

  // Send a notification (for testing)
  async sendTestNotification() {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        alert('Please sign in first');
        return;
      }

      const response = await fetch('/api/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          userId: userId,
          title: 'Test Notification',
          body: 'This is a test notification from JambGenius!',
          type: 'test'
        })
      });

      const data = await response.json();
      if (data.success) {
        console.log('✅ Test notification sent');
        this.showLocalNotification('Test Notification', 'This is a test notification!');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }

  // Send daily study reminder
  async sendDailyReminder() {
    if (!this.preferences.reminders) return;

    try {
      const userId = this.getCurrentUserId();
      if (!userId) return;

      await fetch('/api/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          userId: userId,
          title: '📚 Daily Study Time!',
          body: 'Time to practice! Keep your streak alive 🔥',
          type: 'reminder',
          deepLink: '/practice'
        })
      });
    } catch (error) {
      console.error('Error sending daily reminder:', error);
    }
  }

  // Send chat notification
  async sendChatNotification(senderName, message) {
    if (!this.preferences.chat) return;

    try {
      const userId = this.getCurrentUserId();
      if (!userId) return;

      await fetch('/api/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          userId: userId,
          title: `💬 ${senderName}`,
          body: message.substring(0, 100),
          type: 'chat',
          deepLink: '/chatroom'
        })
      });
    } catch (error) {
      console.error('Error sending chat notification:', error);
    }
  }

  // Send exam alert
  async sendExamAlert(title, message) {
    if (!this.preferences.exams) return;

    try {
      const userId = this.getCurrentUserId();
      if (!userId) return;

      await fetch('/api/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          userId: userId,
          title: `📝 ${title}`,
          body: message,
          type: 'exam',
          deepLink: '/exam'
        })
      });
    } catch (error) {
      console.error('Error sending exam alert:', error);
    }
  }

  // Send streak notification
  async sendStreakNotification(currentStreak) {
    if (!this.preferences.streaks) return;

    try {
      const userId = this.getCurrentUserId();
      if (!userId) return;

      let message = `You're on a ${currentStreak} day streak! 🔥`;
      if (currentStreak === 7) message = 'One week streak! 🎉 Keep going!';
      if (currentStreak === 30) message = '30 day streak! You\'re amazing! 🏆';

      await fetch('/api/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          userId: userId,
          title: '🔥 Streak Updated',
          body: message,
          type: 'streak'
        })
      });
    } catch (error) {
      console.error('Error sending streak notification:', error);
    }
  }

  // Show local notification (fallback for web)
  showLocalNotification(title, message) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/logo.png',
        tag: 'jambgenius'
      });
    }
  }

  // Request notification permission
  async requestPermission() {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  // Update preferences
  setPreferences(newPrefs) {
    this.preferences = { ...this.preferences, ...newPrefs };
    localStorage.setItem('notificationPreferences', JSON.stringify(this.preferences));
    console.log('✅ Notification preferences updated');
  }

  // Get current user ID
  getCurrentUserId() {
    try {
      // Get from auth state
      const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      return user.uid || null;
    } catch (error) {
      return null;
    }
  }
}

// Initialize globally
const notificationManager = new NotificationManager();
