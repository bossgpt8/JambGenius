import { db, auth } from './firebase-init.js';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export async function saveExamResult(examData) {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.log('No user logged in, exam result not saved');
            return null;
        }

        const examResult = {
            userId: user.uid,
            totalScore: examData.totalScore,
            percentage: examData.percentage,
            correctAnswers: examData.correctAnswers,
            wrongAnswers: examData.wrongAnswers,
            subjectScores: examData.subjectScores,
            completedAt: serverTimestamp(),
            timeSpent: examData.timeSpent || 0
        };

        const docRef = await addDoc(collection(db, 'examResults'), examResult);
        console.log('Exam result saved with ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error saving exam result:', error);
        return null;
    }
}

export async function getExamResults() {
    try {
        const user = auth.currentUser;
        if (!user) return [];

        const q = query(collection(db, 'examResults'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        
        const results = [];
        snapshot.forEach(doc => {
            results.push({
                id: doc.id,
                ...doc.data(),
                completedAt: doc.data().completedAt?.toDate?.() || new Date()
            });
        });

        return results.sort((a, b) => b.completedAt - a.completedAt);
    } catch (error) {
        console.error('Error fetching exam results:', error);
        return [];
    }
}

export async function getAnalyticsSummary() {
    try {
        const user = auth.currentUser;
        if (!user) return null;

        const results = await getExamResults();
        
        if (results.length === 0) {
            return {
                totalSessions: 0,
                avgAccuracy: 0,
                totalQuestions: 0,
                totalCorrect: 0,
                subjectStats: {}
            };
        }

        let totalCorrect = 0;
        let totalQuestions = 0;
        const subjectStats = {};

        results.forEach(result => {
            totalCorrect += result.correctAnswers || 0;
            totalQuestions += (result.correctAnswers || 0) + (result.wrongAnswers || 0);

            if (result.subjectScores) {
                Object.entries(result.subjectScores).forEach(([subject, scores]) => {
                    if (!subjectStats[subject]) {
                        subjectStats[subject] = { correct: 0, total: 0 };
                    }
                    subjectStats[subject].correct += scores.correct || 0;
                    subjectStats[subject].total += scores.total || 0;
                });
            }
        });

        const avgAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

        return {
            totalSessions: results.length,
            avgAccuracy,
            totalQuestions,
            totalCorrect,
            subjectStats,
            results
        };
    } catch (error) {
        console.error('Error calculating analytics summary:', error);
        return null;
    }
}
