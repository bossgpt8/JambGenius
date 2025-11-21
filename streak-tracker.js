// Study Streak Tracker - Track consecutive days of practice
import { db, auth } from './firebase-init.js';
import { doc, setDoc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class StreakTracker {
  constructor() {
    this.streaksCollection = 'streaks';
    this.currentStreak = 0;
    this.longestStreak = 0;
    this.lastPracticeDate = null;
    this.today = this.getToday();
    this.loadLocal();
  }

  // Get today's date in YYYY-MM-DD format
  getToday() {
    return new Date().toISOString().split('T')[0];
  }

  // Load streak from localStorage
  loadLocal() {
    const stored = localStorage.getItem('jambgenius_streak');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        this.currentStreak = data.currentStreak || 0;
        this.longestStreak = data.longestStreak || 0;
        this.lastPracticeDate = data.lastPracticeDate;
      } catch (e) {
        console.error('Error loading streak:', e);
      }
    }
  }

  // Save streak to localStorage
  saveLocal() {
    localStorage.setItem('jambgenius_streak', JSON.stringify({
      currentStreak: this.currentStreak,
      longestStreak: this.longestStreak,
      lastPracticeDate: this.lastPracticeDate,
      savedAt: new Date().toISOString()
    }));
  }

  // Record practice activity
  recordPractice() {
    const today = this.getToday();
    
    if (this.lastPracticeDate === today) {
      // Already practiced today
      return this.currentStreak;
    }

    if (this.lastPracticeDate === this.getYesterday()) {
      // Continue streak
      this.currentStreak++;
    } else {
      // Streak broken or first practice
      this.currentStreak = 1;
    }

    // Update longest streak
    if (this.currentStreak > this.longestStreak) {
      this.longestStreak = this.currentStreak;
    }

    this.lastPracticeDate = today;
    this.saveLocal();
    this.saveToFirestore();

    return this.currentStreak;
  }

  // Get yesterday's date
  getYesterday() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  // Save streak to Firestore
  async saveToFirestore() {
    if (!auth.currentUser) return;

    try {
      const userStreakRef = doc(db, this.streaksCollection, auth.currentUser.uid);
      await setDoc(userStreakRef, {
        userId: auth.currentUser.uid,
        currentStreak: this.currentStreak,
        longestStreak: this.longestStreak,
        lastPracticeDate: this.lastPracticeDate,
        lastUpdated: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error saving streak to Firestore:', error);
    }
  }

  // Load streak from Firestore
  async loadFromFirestore() {
    if (!auth.currentUser) return;

    try {
      const userStreakRef = doc(db, this.streaksCollection, auth.currentUser.uid);
      const streakDoc = await getDoc(userStreakRef);
      
      if (streakDoc.exists()) {
        const data = streakDoc.data();
        this.currentStreak = data.currentStreak || 0;
        this.longestStreak = data.longestStreak || 0;
        this.lastPracticeDate = data.lastPracticeDate;
        this.saveLocal();
      }
    } catch (error) {
      console.error('Error loading streak from Firestore:', error);
    }
  }

  // Get current streak
  getCurrentStreak() {
    return this.currentStreak;
  }

  // Get longest streak
  getLongestStreak() {
    return this.longestStreak;
  }

  // Get streak status message
  getStreakStatus() {
    if (this.currentStreak === 0) {
      return 'Start your streak today! 🔥';
    } else if (this.currentStreak === 1) {
      return 'Day 1 of your streak! 🎯';
    } else if (this.currentStreak < 7) {
      return `${this.currentStreak} day streak! Keep going! 🔥`;
    } else if (this.currentStreak < 30) {
      return `${this.currentStreak} day streak! Amazing! 🚀`;
    } else {
      return `${this.currentStreak} day streak! Legend status! 👑`;
    }
  }

  // Get badge based on streak
  getStreakBadge() {
    if (this.currentStreak >= 100) return '👑';
    if (this.currentStreak >= 30) return '🚀';
    if (this.currentStreak >= 7) return '🔥';
    if (this.currentStreak >= 1) return '🎯';
    return '';
  }
}

export const streakTracker = new StreakTracker();
