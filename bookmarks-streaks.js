// Bookmarks & Study Streaks Management Module
import { auth, db } from './firebase-init.js';
import { collection, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, getDocs, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export class BookmarksAndStreaks {
    constructor() {
        this.currentUser = null;
        this.currentStreak = 0;
        this.totalBookmarks = 0;
    }

    setUser(user) {
        this.currentUser = user;
    }

    // Add or remove bookmark
    async toggleBookmark(questionId, questionData) {
        if (!this.currentUser) return false;

        try {
            const bookmarksRef = doc(db, 'userBookmarks', this.currentUser.uid);
            const bookmarkDoc = await getDoc(bookmarksRef);

            if (bookmarkDoc.exists()) {
                const bookmarks = bookmarkDoc.data().bookmarks || [];
                const isBookmarked = bookmarks.some(b => b.questionId === questionId);

                if (isBookmarked) {
                    await updateDoc(bookmarksRef, {
                        bookmarks: arrayRemove(...bookmarks.filter(b => b.questionId === questionId))
                    });
                } else {
                    await updateDoc(bookmarksRef, {
                        bookmarks: arrayUnion({
                            questionId,
                            ...questionData,
                            bookmarkedAt: serverTimestamp()
                        })
                    });
                }
            } else {
                await setDoc(bookmarksRef, {
                    userId: this.currentUser.uid,
                    bookmarks: [{
                        questionId,
                        ...questionData,
                        bookmarkedAt: serverTimestamp()
                    }],
                    createdAt: serverTimestamp()
                });
            }

            return true;
        } catch (error) {
            console.error('Error toggling bookmark:', error);
            return false;
        }
    }

    // Check if question is bookmarked
    async isBookmarked(questionId) {
        if (!this.currentUser) return false;

        try {
            const bookmarksRef = doc(db, 'userBookmarks', this.currentUser.uid);
            const bookmarkDoc = await getDoc(bookmarksRef);

            if (bookmarkDoc.exists()) {
                const bookmarks = bookmarkDoc.data().bookmarks || [];
                return bookmarks.some(b => b.questionId === questionId);
            }
            return false;
        } catch (error) {
            console.error('Error checking bookmark:', error);
            return false;
        }
    }

    // Get all bookmarks
    async getBookmarks() {
        if (!this.currentUser) return [];

        try {
            const bookmarksRef = doc(db, 'userBookmarks', this.currentUser.uid);
            const bookmarkDoc = await getDoc(bookmarksRef);

            if (bookmarkDoc.exists()) {
                return bookmarkDoc.data().bookmarks || [];
            }
            return [];
        } catch (error) {
            console.error('Error getting bookmarks:', error);
            return [];
        }
    }

    // Update study streak
    async updateStreak() {
        if (!this.currentUser) return;

        try {
            const streakRef = doc(db, 'userStreaks', this.currentUser.uid);
            const streakDoc = await getDoc(streakRef);
            
            const today = new Date().toDateString();
            
            if (streakDoc.exists()) {
                const data = streakDoc.data();
                const lastActivity = data.lastActivityDate;

                if (lastActivity === today) {
                    // Already answered today, don't increment
                    return;
                }

                const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toDateString();
                const streak = lastActivity === yesterday ? data.currentStreak + 1 : 1;

                await updateDoc(streakRef, {
                    currentStreak: streak,
                    lastActivityDate: today,
                    longestStreak: Math.max(data.longestStreak || streak, streak),
                    totalQuestionsAnswered: (data.totalQuestionsAnswered || 0) + 1,
                    lastUpdated: serverTimestamp()
                });

                this.currentStreak = streak;
            } else {
                await setDoc(streakRef, {
                    userId: this.currentUser.uid,
                    currentStreak: 1,
                    longestStreak: 1,
                    lastActivityDate: today,
                    totalQuestionsAnswered: 1,
                    createdAt: serverTimestamp(),
                    lastUpdated: serverTimestamp()
                });

                this.currentStreak = 1;
            }
        } catch (error) {
            console.error('Error updating streak:', error);
        }
    }

    // Get streak data
    async getStreakData() {
        if (!this.currentUser) return null;

        try {
            const streakRef = doc(db, 'userStreaks', this.currentUser.uid);
            const streakDoc = await getDoc(streakRef);

            if (streakDoc.exists()) {
                return streakDoc.data();
            }
            return {
                currentStreak: 0,
                longestStreak: 0,
                totalQuestionsAnswered: 0
            };
        } catch (error) {
            console.error('Error getting streak data:', error);
            return null;
        }
    }

    // Store question explanation
    async saveExplanation(questionId, explanation) {
        if (!this.currentUser) return false;

        try {
            const explanationRef = doc(db, 'questionExplanations', this.currentUser.uid + '_' + questionId);
            await setDoc(explanationRef, {
                userId: this.currentUser.uid,
                questionId,
                explanation,
                createdAt: serverTimestamp()
            }, { merge: true });

            return true;
        } catch (error) {
            console.error('Error saving explanation:', error);
            return false;
        }
    }

    // Get explanation for a question
    async getExplanation(questionId) {
        if (!this.currentUser) return null;

        try {
            const explanationRef = doc(db, 'questionExplanations', this.currentUser.uid + '_' + questionId);
            const explanationDoc = await getDoc(explanationRef);

            if (explanationDoc.exists()) {
                return explanationDoc.data().explanation;
            }
            return null;
        } catch (error) {
            console.error('Error getting explanation:', error);
            return null;
        }
    }
}

export default BookmarksAndStreaks;
