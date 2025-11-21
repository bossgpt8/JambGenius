// Question Bookmarking System - Save and manage favorite questions
import { db, auth } from './firebase-init.js';
import { doc, setDoc, deleteDoc, getDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class BookmarkManager {
  constructor() {
    this.bookmarksCollection = 'bookmarks';
    this.bookmarkedQuestions = new Set();
    this.loadLocal();
  }

  // Generate question ID
  generateQuestionId(question) {
    return btoa(`${question.subject}_${question.question}`).replace(/=/g, '').substring(0, 20);
  }

  // Load bookmarks from localStorage
  loadLocal() {
    const stored = localStorage.getItem('jambgenius_bookmarks');
    if (stored) {
      try {
        this.bookmarkedQuestions = new Set(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading bookmarks:', e);
      }
    }
  }

  // Save bookmarks to localStorage
  saveLocal() {
    localStorage.setItem('jambgenius_bookmarks', JSON.stringify(Array.from(this.bookmarkedQuestions)));
  }

  // Toggle bookmark on a question
  async toggleBookmark(question) {
    const questionId = this.generateQuestionId(question);
    const isBookmarked = this.bookmarkedQuestions.has(questionId);

    if (isBookmarked) {
      await this.removeBookmark(question);
    } else {
      await this.addBookmark(question);
    }

    return !isBookmarked;
  }

  // Add bookmark
  async addBookmark(question) {
    const questionId = this.generateQuestionId(question);

    if (this.bookmarkedQuestions.has(questionId)) {
      return;
    }

    this.bookmarkedQuestions.add(questionId);
    this.saveLocal();

    if (auth.currentUser) {
      try {
        const bookmarkRef = doc(db, this.bookmarksCollection, auth.currentUser.uid, 'questions', questionId);
        await setDoc(bookmarkRef, {
          questionId: questionId,
          question: question.question,
          subject: question.subject,
          options: question.options || {},
          correctAnswer: question.correctAnswer,
          explanation: question.explanation || '',
          difficulty: question.difficulty || 'medium',
          bookmarkedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error saving bookmark to Firestore:', error);
      }
    }
  }

  // Remove bookmark
  async removeBookmark(question) {
    const questionId = this.generateQuestionId(question);
    this.bookmarkedQuestions.delete(questionId);
    this.saveLocal();

    if (auth.currentUser) {
      try {
        const bookmarkRef = doc(db, this.bookmarksCollection, auth.currentUser.uid, 'questions', questionId);
        await deleteDoc(bookmarkRef);
      } catch (error) {
        console.error('Error removing bookmark from Firestore:', error);
      }
    }
  }

  // Check if question is bookmarked
  isBookmarked(question) {
    const questionId = this.generateQuestionId(question);
    return this.bookmarkedQuestions.has(questionId);
  }

  // Get all bookmarked questions
  async getBookmarkedQuestions() {
    if (!auth.currentUser) {
      return [];
    }

    try {
      const bookmarksRef = collection(db, this.bookmarksCollection, auth.currentUser.uid, 'questions');
      const snapshot = await getDocs(bookmarksRef);
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      return [];
    }
  }

  // Load bookmarks from Firestore
  async loadFromFirestore() {
    if (!auth.currentUser) return;

    try {
      const bookmarks = await this.getBookmarkedQuestions();
      bookmarks.forEach(bookmark => {
        this.bookmarkedQuestions.add(bookmark.questionId);
      });
      this.saveLocal();
    } catch (error) {
      console.error('Error loading bookmarks from Firestore:', error);
    }
  }

  // Count bookmarked questions
  getBookmarkCount() {
    return this.bookmarkedQuestions.size;
  }
}

export const bookmarkManager = new BookmarkManager();
