// Mock questions for fallback
const MOCK_QUESTIONS = {
    english: [
        { id: 1, subject: 'english', question: 'Choose the word that best completes the sentence: The student was _____ for his outstanding performance.', option_a: 'commended', option_b: 'commanded', option_c: 'commented', option_d: 'commenced', correct_answer: 'A', explanation: 'Commended means to praise formally or officially.' },
        { id: 2, subject: 'english', question: 'Identify the part of speech of the underlined word: She runs <u>quickly</u>.', option_a: 'Noun', option_b: 'Verb', option_c: 'Adverb', option_d: 'Adjective', correct_answer: 'C', explanation: 'Quickly modifies the verb "runs" and is therefore an adverb.' }
    ],
    mathematics: [
        { id: 1, subject: 'mathematics', question: 'Solve for x: 2x + 5 = 13', option_a: '3', option_b: '4', option_c: '5', option_d: '6', correct_answer: 'B', explanation: '2x + 5 = 13, 2x = 8, x = 4' }
    ],
    physics: [
        { id: 1, subject: 'physics', question: 'What is the SI unit of force?', option_a: 'Joule', option_b: 'Newton', option_c: 'Watt', option_d: 'Pascal', correct_answer: 'B', explanation: 'The Newton (N) is the SI unit of force.' }
    ],
    chemistry: [
        { id: 1, subject: 'chemistry', question: 'What is the chemical symbol for Gold?', option_a: 'Go', option_b: 'Gd', option_c: 'Au', option_d: 'Ag', correct_answer: 'C', explanation: 'Au is the chemical symbol for Gold.' }
    ],
    biology: [
        { id: 1, subject: 'biology', question: 'What is the powerhouse of the cell?', option_a: 'Nucleus', option_b: 'Mitochondria', option_c: 'Ribosome', option_d: 'Chloroplast', correct_answer: 'B', explanation: 'Mitochondria generate most of the chemical energy needed to power the cell.' }
    ]
};

let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let correctCount = 0;
let useMockData = false;
let isTimedMode = false;
let timeRemaining = 1200; // 20 minutes
let timerInterval = null;
let startTime = null;
let bookmarkedQuestions = new Set();
let antiCheat = null;
let currentUser = null;

const urlParams = new URLSearchParams(window.location.search);
const subject = urlParams.get('subject') || 'english';

function waitForCustomModal() {
    return new Promise((resolve) => {
        if (typeof window.customModal !== 'undefined') {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (typeof window.customModal !== 'undefined') {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 50);
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await waitForCustomModal();
    antiCheat = new AntiCheatSystem(() => {
        customModal.alert('Maximum violations reached. Your practice session will end.', 'Session Ended');
        showCompletion();
    });
    
    // Get current user
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
    const auth = getAuth();
    auth.onAuthStateChanged((user) => {
        currentUser = user;
        if (user) {
            streakTracker.loadFromFirestore();
            bookmarkManager.loadFromFirestore();
        }
    });
});

// Mode selection
document.getElementById('freeModeBtn').addEventListener('click', () => {
    const btn = document.getElementById('freeModeBtn');
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.innerHTML = '<div class="text-center"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto"></div><p class="mt-2">Loading...</p></div>';
    
    setTimeout(() => {
        isTimedMode = false;
        document.getElementById('modeSelectionModal').classList.add('hidden');
        document.getElementById('modeDescription').textContent = 'Answer at your own pace with instant feedback';
        initializePractice();
    }, 300);
});

document.getElementById('timedModeBtn').addEventListener('click', () => {
    const btn = document.getElementById('timedModeBtn');
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.innerHTML = '<div class="text-center"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto"></div><p class="mt-2">Loading...</p></div>';
    
    setTimeout(() => {
        isTimedMode = true;
        document.getElementById('modeSelectionModal').classList.add('hidden');
        document.getElementById('modeDescription').textContent = 'Complete in 20 minutes';
        document.getElementById('timerDisplay').classList.remove('hidden');
        initializePractice();
    }, 300);
});

async function initializePractice() {
    document.getElementById('subjectTitle').textContent = `Practice: ${capitalizeFirst(subject)}`;
    document.getElementById('loadingScreen').classList.remove('hidden');
    
    const supabaseConfigured = isSupabaseConfigured();
    
    if (!supabaseConfigured) {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('setupAlert').classList.remove('hidden');
        
        document.getElementById('useMockDataBtn').addEventListener('click', () => {
            useMockData = true;
            document.getElementById('setupAlert').classList.add('hidden');
            loadQuestions();
        });
        
        return;
    }
    
    await loadQuestions();
}

async function loadQuestions() {
    try {
        let questions = null;
        
        if (!useMockData) {
            questions = await loadQuestionsFromSupabase(subject, 20);
        }
        
        if (!questions || questions.length === 0) {
            const mockQuestions = MOCK_QUESTIONS[subject.toLowerCase()] || MOCK_QUESTIONS.english;
            questions = Array(20).fill(null).map((_, i) => ({
                ...mockQuestions[i % mockQuestions.length],
                id: `mock_${i + 1}`
            }));
        }
        
        currentQuestions = shuffleArray(questions);
        userAnswers = new Array(currentQuestions.length).fill(null);
        loadBookmarks();
        
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('practiceInterface').classList.remove('hidden');
        
        if (isTimedMode) {
            startTimer();
        }
        
        startTime = Date.now();
        renderQuestion();
        
        if (antiCheat) {
            antiCheat.startMonitoring();
        }
    } catch (error) {
        console.error('Error loading questions:', error);
        customModal.error('Failed to load questions. Please try again.', 'Loading Error');
    }
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function startTimer() {
    timerInterval = setInterval(() => {
        timeRemaining--;
        
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        
        document.getElementById('timeRemaining').textContent = 
            `${minutes}:${String(seconds).padStart(2, '0')}`;
        
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            showCompletion();
        }
        
        if (timeRemaining <= 60) {
            document.getElementById('timerDisplay').classList.add('animate-pulse');
        }
    }, 1000);
}

function loadBookmarks() {
    const saved = localStorage.getItem('jambgenius_bookmarks');
    if (saved) {
        bookmarkedQuestions = new Set(JSON.parse(saved));
    }
}

function saveBookmarks() {
    localStorage.setItem('jambgenius_bookmarks', JSON.stringify([...bookmarkedQuestions]));
}

async function toggleBookmark() {
    const question = currentQuestions[currentQuestionIndex];
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    const icon = bookmarkBtn.querySelector('i');
    
    // Toggle bookmark using bookmarkManager
    await bookmarkManager.toggleBookmark({
        question: question.question,
        subject: question.subject || subject,
        options: {
            A: question.option_a,
            B: question.option_b,
            C: question.option_c,
            D: question.option_d
        },
        correctAnswer: question.correct_answer,
        explanation: question.explanation,
        difficulty: 'medium'
    });
    
    // Update icon
    const isBookmarked = bookmarkManager.isBookmarked({
        question: question.question,
        subject: question.subject || subject
    });
    
    if (isBookmarked) {
        icon.classList.remove('far');
        icon.classList.add('fas');
    } else {
        icon.classList.remove('fas');
        icon.classList.add('far');
    }
}

document.getElementById('bookmarkBtn').addEventListener('click', toggleBookmark);

function renderQuestion() {
    const question = currentQuestions[currentQuestionIndex];
    
    document.getElementById('currentQuestionNum').textContent = currentQuestionIndex + 1;
    document.getElementById('questionCounter').textContent = `${currentQuestionIndex + 1}/${currentQuestions.length}`;
    document.getElementById('questionText').textContent = question.question;
    
    // Update bookmark icon
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    const icon = bookmarkBtn.querySelector('i');
    if (bookmarkedQuestions.has(question.id)) {
        icon.classList.remove('far');
        icon.classList.add('fas');
    } else {
        icon.classList.remove('fas');
        icon.classList.add('far');
    }
    
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    
    const options = ['A', 'B', 'C', 'D'];
    options.forEach(opt => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option-btn p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-all';
        optionDiv.dataset.option = opt;
        
        const isSelected = userAnswers[currentQuestionIndex]?.selected === opt;
        if (isSelected) {
            optionDiv.classList.add('border-primary-500', 'bg-primary-50');
        }
        
        optionDiv.innerHTML = `
            <div class="flex items-center">
                <div class="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center mr-3 font-semibold">
                    ${opt}
                </div>
                <div class="flex-1">${question[`option_${opt.toLowerCase()}`]}</div>
            </div>
        `;
        
        optionDiv.addEventListener('click', () => selectOption(opt));
        optionsContainer.appendChild(optionDiv);
    });
    
    if (userAnswers[currentQuestionIndex]) {
        showFeedback();
    } else {
        document.getElementById('feedback').classList.add('hidden');
    }
    
    updateNavigation();
    updateScore();
}

async function selectOption(option) {
    if (userAnswers[currentQuestionIndex]) return;
    
    const question = currentQuestions[currentQuestionIndex];
    const isCorrect = option === question.correct_answer;
    
    userAnswers[currentQuestionIndex] = {
        selected: option,
        correct: isCorrect
    };
    
    if (isCorrect) correctCount++;
    
    // Record streak for first answer in session
    if (currentUser && userAnswers.filter(a => a !== null).length === 1) {
        streakTracker.recordPractice();
    }
    
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('border-primary-500', 'bg-primary-50');
        btn.style.pointerEvents = 'none';
    });
    
    const selectedBtn = document.querySelector(`[data-option="${option}"]`);
    selectedBtn.classList.add('border-primary-500', 'bg-primary-50');
    
    showFeedback();
    updateScore();
    
    // Show AI explanation button
    const aiExplainBtn = document.getElementById('aiExplainBtn');
    if (aiExplainBtn) {
        aiExplainBtn.classList.remove('hidden');
    }
}

function showFeedback() {
    const question = currentQuestions[currentQuestionIndex];
    const answer = userAnswers[currentQuestionIndex];
    
    if (!answer) return;
    
    const feedback = document.getElementById('feedback');
    feedback.classList.remove('hidden');
    
    if (answer.correct) {
        feedback.className = 'mt-6 p-4 rounded-lg bg-green-50 border-2 border-green-200';
        feedback.innerHTML = `
            <div class="flex items-start space-x-3">
                <i class="fas fa-check-circle text-2xl text-green-600 mt-1"></i>
                <div>
                    <div class="font-semibold text-green-900 mb-1">Correct!</div>
                    <div class="text-green-800">${question.explanation || 'Well done!'}</div>
                </div>
            </div>
        `;
    } else {
        feedback.className = 'mt-6 p-4 rounded-lg bg-red-50 border-2 border-red-200';
        feedback.innerHTML = `
            <div class="flex items-start space-x-3">
                <i class="fas fa-times-circle text-2xl text-red-600 mt-1"></i>
                <div>
                    <div class="font-semibold text-red-900 mb-1">Incorrect</div>
                    <div class="text-red-800 mb-2">The correct answer is <strong>${question.correct_answer}</strong></div>
                    <div class="text-red-700">${question.explanation || ''}</div>
                </div>
            </div>
        `;
    }
}

function updateNavigation() {
    document.getElementById('prevBtn').disabled = currentQuestionIndex === 0;
    
    const nextBtn = document.getElementById('nextBtn');
    if (currentQuestionIndex === currentQuestions.length - 1) {
        nextBtn.textContent = 'Finish';
        nextBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Finish';
    } else {
        nextBtn.innerHTML = 'Next<i class="fas fa-arrow-right ml-2"></i>';
    }
}

function updateScore() {
    const answered = userAnswers.filter(a => a !== null).length;
    document.getElementById('correctCount').textContent = correctCount;
    document.getElementById('answeredCount').textContent = answered;
}

document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
    }
});

document.getElementById('nextBtn').addEventListener('click', () => {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    } else {
        showCompletion();
    }
});

function showCompletion() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    if (antiCheat) {
        antiCheat.stopMonitoring();
    }
    
    const endTime = Date.now();
    const timeTaken = Math.floor((endTime - startTime) / 1000);
    const answered = userAnswers.filter(a => a !== null).length;
    const wrong = answered - correctCount;
    const percentage = answered > 0 ? Math.round((correctCount / answered) * 100) : 0;
    
    document.getElementById('finalScore').textContent = `${percentage}%`;
    document.getElementById('finalCorrect').textContent = correctCount;
    document.getElementById('finalWrong').textContent = wrong;
    
    const minutes = Math.floor(timeTaken / 60);
    const seconds = timeTaken % 60;
    document.getElementById('finalTime').textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
    
    // Generate detailed report
    const reportDetails = document.getElementById('reportDetails');
    reportDetails.innerHTML = `
        <div><strong>Subject:</strong> ${capitalizeFirst(subject)}</div>
        <div><strong>Mode:</strong> ${isTimedMode ? 'Timed Practice' : 'Free Practice'}</div>
        <div><strong>Questions Answered:</strong> ${answered} / ${currentQuestions.length}</div>
        <div><strong>Accuracy:</strong> ${percentage}%</div>
        <div><strong>Time Taken:</strong> ${minutes}m ${seconds}s</div>
        <div><strong>Date:</strong> ${new Date().toLocaleString()}</div>
    `;
    
    // Save to analytics
    savePracticeSession({
        subject,
        mode: isTimedMode ? 'timed' : 'free',
        total: currentQuestions.length,
        answered,
        correct: correctCount,
        wrong,
        percentage,
        timeTaken,
        date: new Date().toISOString()
    });
    
    document.getElementById('completionModal').classList.remove('hidden');
}

function savePracticeSession(data) {
    const sessions = JSON.parse(localStorage.getItem('jambgenius_sessions') || '[]');
    sessions.push(data);
    localStorage.setItem('jambgenius_sessions', JSON.stringify(sessions));
}

document.getElementById('downloadReportBtn').addEventListener('click', () => {
    const answered = userAnswers.filter(a => a !== null).length;
    const wrong = answered - correctCount;
    const percentage = answered > 0 ? Math.round((correctCount / answered) * 100) : 0;
    const timeTaken = document.getElementById('finalTime').textContent;
    
    const reportText = `
JAMBGENIUS PRACTICE REPORT
==========================

Subject: ${capitalizeFirst(subject)}
Mode: ${isTimedMode ? 'Timed Practice (20 min)' : 'Free Practice'}
Date: ${new Date().toLocaleString()}

PERFORMANCE
-----------
Score: ${percentage}%
Correct Answers: ${correctCount}
Wrong Answers: ${wrong}
Total Questions: ${answered}
Time Taken: ${timeTaken}

QUESTION BREAKDOWN
------------------
${currentQuestions.map((q, i) => {
    const ans = userAnswers[i];
    if (!ans) return `Q${i+1}: Not answered`;
    return `Q${i+1}: ${ans.correct ? '✓ Correct' : '✗ Wrong'} (Your answer: ${ans.selected}, Correct: ${q.correct_answer})`;
}).join('\n')}

Bookmarked Questions: ${bookmarkedQuestions.size}

---
Generated by JambGenius 💯
Nigeria's Premier JAMB Preparation Platform
    `.trim();
    
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JambGenius_${subject}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('reviewBtn').addEventListener('click', () => {
    document.getElementById('completionModal').classList.add('hidden');
    currentQuestionIndex = 0;
    renderQuestion();
});

document.getElementById('newPracticeBtn').addEventListener('click', () => {
    window.location.href = 'practice-mode-subjects.html';
});

// AI Explanation Button Handler
document.getElementById('aiExplainBtn')?.addEventListener('click', async () => {
    const question = currentQuestions[currentQuestionIndex];
    const answer = userAnswers[currentQuestionIndex];
    const btn = document.getElementById('aiExplainBtn');
    
    btn.disabled = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';
    
    try {
        const response = await fetch('/api/gemini-explain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: question.question,
                options: {
                    A: question.option_a,
                    B: question.option_b,
                    C: question.option_c,
                    D: question.option_d
                },
                correctAnswer: question.correct_answer,
                userAnswer: answer?.selected
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.explanation) {
            // Show explanation in feedback area
            const feedback = document.getElementById('feedback');
            feedback.className = 'mt-6 p-4 rounded-lg bg-purple-50 border-2 border-purple-200';
            feedback.innerHTML = `
                <div class="flex items-start space-x-3">
                    <i class="fas fa-lightbulb text-2xl text-purple-600 mt-1"></i>
                    <div>
                        <div class="font-semibold text-purple-900 mb-2">AI Explanation</div>
                        <div class="text-purple-800">${data.explanation}</div>
                    </div>
                </div>
            `;
            feedback.classList.remove('hidden');
        } else {
            alert('Unable to generate explanation. Please try again.');
        }
    } catch (error) {
        console.error('Error getting explanation:', error);
        alert('Error loading explanation. Please check your connection and try again.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
});
