class AntiCheatSystem {
    constructor(onViolationLimit) {
        this.warningCount = 0;
        this.maxWarnings = 3;
        this.onViolationLimit = onViolationLimit;
        this.isExamStarted = false;
        this.violations = [];
        this.isModalOpen = false;
        this.wasWindowVisible = true;
        this.initialize();
    }

    initialize() {
        this.preventScreenCapture();
        this.detectTabSwitch();
        this.preventRightClick();
    }

    startMonitoring() {
        this.isExamStarted = true;
        if (this.originalGetDisplayMedia && navigator.mediaDevices) {
            const self = this;
            navigator.mediaDevices.getDisplayMedia = async function() {
                if (self.isExamStarted) {
                    console.warn('Screen recording attempt blocked during exam');
                    self.recordViolation('Screen recording attempt blocked');
                    throw new Error('Screen recording is not allowed during exam');
                }
                return self.originalGetDisplayMedia.apply(this, arguments);
            };
        }
        console.log('Anti-cheat monitoring started');
    }

    stopMonitoring() {
        this.isExamStarted = false;
        if (this.originalGetDisplayMedia && navigator.mediaDevices) {
            navigator.mediaDevices.getDisplayMedia = this.originalGetDisplayMedia;
        }
        console.log('Anti-cheat monitoring stopped');
    }

    preventScreenCapture() {
        document.addEventListener('keyup', (e) => {
            if (!this.isExamStarted) return;

            if (e.key === 'PrintScreen') {
                navigator.clipboard.writeText('');
                this.recordViolation('Screenshot attempt detected');
            }
        });

        document.addEventListener('keydown', (e) => {
            if (!this.isExamStarted) return;

            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
                e.preventDefault();
                this.recordViolation('Screenshot shortcut blocked');
                return false;
            }

            if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
                e.preventDefault();
                this.recordViolation('Print attempt blocked');
                return false;
            }

            if (e.key === 'F12' || 
                ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) ||
                ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j')) ||
                ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u'))) {
                e.preventDefault();
                this.recordViolation('Developer tools access blocked');
                return false;
            }
        });

        this.originalGetDisplayMedia = null;
        if (typeof navigator.mediaDevices !== 'undefined' && navigator.mediaDevices.getDisplayMedia) {
            this.originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
        }
    }

    detectTabSwitch() {
        document.addEventListener('visibilitychange', () => {
            if (!this.isExamStarted) return;
            if (this.isModalOpen) return; // Don't trigger if modal is open

            // Only record if actually hidden (not just focus lost)
            if (document.hidden) {
                this.recordViolation('Left exam page / switched tab');
                this.showWarning();
            }
        });

        window.addEventListener('blur', () => {
            if (!this.isExamStarted) return;
            if (this.isModalOpen) return; // Don't trigger if modal is open
            if (document.hidden) return; // Only count if page is actually hidden
            
            // Allow blur without recording if modal is open or page is still visible
        });
    }

    // Call this when opening/closing confirmation dialogs
    setModalOpen(isOpen) {
        this.isModalOpen = isOpen;
    }

    preventRightClick() {
        document.addEventListener('contextmenu', (e) => {
            if (this.isExamStarted) {
                e.preventDefault();
                return false;
            }
        });
    }

    recordViolation(type) {
        const violation = {
            type,
            timestamp: new Date().toISOString()
        };
        this.violations.push(violation);
        console.warn('Violation recorded:', violation);
    }

    showWarning() {
        this.warningCount++;
        const remaining = this.maxWarnings - this.warningCount;

        const warningModal = document.createElement('div');
        warningModal.id = 'violationWarning';
        warningModal.className = 'fixed inset-0 bg-black bg-opacity-75 z-[100] flex items-center justify-center p-4';
        warningModal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-pulse">
                <div class="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-exclamation-triangle text-4xl text-red-600"></i>
                </div>
                <h2 class="text-3xl font-bold text-red-600 mb-4">Malpractice Warning!</h2>
                <p class="text-gray-700 text-lg mb-4">
                    You have been detected leaving the exam page or attempting prohibited actions.
                </p>
                <div class="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                    <p class="text-red-700 font-bold text-xl">
                        Warning ${this.warningCount} of ${this.maxWarnings}
                    </p>
                    ${remaining > 0 ? `
                        <p class="text-red-600 mt-2">
                            ${remaining} warning${remaining > 1 ? 's' : ''} remaining before exam submission
                        </p>
                    ` : ''}
                </div>
                ${remaining > 0 ? `
                    <button id="continueExamBtn" class="w-full bg-primary-600 text-white py-4 rounded-lg hover:bg-primary-700 transition-colors font-bold text-lg">
                        <i class="fas fa-arrow-right mr-2"></i>Return to Exam
                    </button>
                ` : `
                    <div class="text-red-700 font-semibold mb-4">
                        Maximum warnings reached. Your exam will be submitted automatically.
                    </div>
                    <div class="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                `}
            </div>
        `;

        document.body.appendChild(warningModal);

        if (remaining > 0) {
            const continueBtn = document.getElementById('continueExamBtn');
            if (continueBtn) {
                continueBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    warningModal.remove();
                });
            }
        } else {
            setTimeout(() => {
                if (this.onViolationLimit) {
                    warningModal.remove();
                    this.onViolationLimit(this.violations);
                }
            }, 2000);
        }
    }

    getViolations() {
        return this.violations;
    }

    getWarningCount() {
        return this.warningCount;
    }
}

function showExamRules(onAccept) {
    const rulesModal = document.createElement('div');
    rulesModal.id = 'examRulesModal';
    rulesModal.className = 'fixed inset-0 bg-black bg-opacity-75 z-[100] flex items-center justify-center p-4';
    rulesModal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <div class="text-center mb-6">
                <div class="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-shield-alt text-4xl text-white"></i>
                </div>
                <h2 class="text-3xl font-bold text-gray-900 mb-2">Exam Rules & Regulations</h2>
                <p class="text-gray-600">Please read carefully before starting</p>
            </div>

            <div class="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-6">
                <div class="flex items-start space-x-3">
                    <i class="fas fa-exclamation-circle text-2xl text-yellow-600 mt-1"></i>
                    <div>
                        <h3 class="font-bold text-gray-900 text-lg mb-2">Anti-Malpractice System Active</h3>
                        <p class="text-gray-700">
                            This exam is protected by an advanced anti-cheating system that monitors for violations.
                        </p>
                    </div>
                </div>
            </div>

            <div class="space-y-4 mb-8">
                <div class="border-l-4 border-red-500 pl-4 py-2">
                    <h4 class="font-bold text-gray-900 mb-2 flex items-center">
                        <i class="fas fa-ban text-red-600 mr-2"></i>
                        Strictly Prohibited Actions
                    </h4>
                    <ul class="list-disc list-inside space-y-2 text-gray-700">
                        <li>Switching to other tabs or applications</li>
                        <li>Leaving the exam page</li>
                        <li>Taking screenshots or screen recordings</li>
                        <li>Opening developer tools</li>
                        <li>Using external resources or materials</li>
                        <li>Copying or sharing exam content</li>
                    </ul>
                </div>

                <div class="border-l-4 border-orange-500 pl-4 py-2">
                    <h4 class="font-bold text-gray-900 mb-2 flex items-center">
                        <i class="fas fa-exclamation-triangle text-orange-600 mr-2"></i>
                        Warning System
                    </h4>
                    <ul class="list-disc list-inside space-y-2 text-gray-700">
                        <li>You will receive a warning for each violation detected</li>
                        <li>Maximum of 3 warnings allowed</li>
                        <li>After 3 warnings, your exam will be automatically submitted</li>
                        <li>All violations are logged and timestamped</li>
                    </ul>
                </div>

                <div class="border-l-4 border-green-500 pl-4 py-2">
                    <h4 class="font-bold text-gray-900 mb-2 flex items-center">
                        <i class="fas fa-check-circle text-green-600 mr-2"></i>
                        Allowed During Exam
                    </h4>
                    <ul class="list-disc list-inside space-y-2 text-gray-700">
                        <li>Using the built-in calculator (for Math, Physics, Chemistry)</li>
                        <li>Navigating between questions</li>
                        <li>Bookmarking questions for review</li>
                        <li>Submitting your exam when ready</li>
                    </ul>
                </div>

                <div class="border-l-4 border-blue-500 pl-4 py-2">
                    <h4 class="font-bold text-gray-900 mb-2 flex items-center">
                        <i class="fas fa-info-circle text-blue-600 mr-2"></i>
                        Important Information
                    </h4>
                    <ul class="list-disc list-inside space-y-2 text-gray-700">
                        <li>Exam duration: 2 hours (120 minutes)</li>
                        <li>Total questions: 180 (60 English + 40 each for other subjects)</li>
                        <li>Your exam will auto-submit when time expires</li>
                        <li>Ensure stable internet connection</li>
                        <li>Work in fullscreen mode for best experience</li>
                    </ul>
                </div>
            </div>

            <div class="bg-gray-50 border-2 border-gray-200 rounded-xl p-6 mb-6">
                <div class="flex items-start space-x-3">
                    <input type="checkbox" id="agreeRules" class="mt-1 w-5 h-5 text-primary-600 rounded">
                    <label for="agreeRules" class="text-gray-700 font-medium">
                        I have read and understood all the exam rules and regulations. I agree to follow them strictly and accept that violations will result in warnings and possible auto-submission of my exam.
                    </label>
                </div>
            </div>

            <div class="flex space-x-4">
                <button id="declineRulesBtn" class="flex-1 bg-gray-300 text-gray-700 py-4 rounded-lg hover:bg-gray-400 transition-colors font-bold text-lg">
                    <i class="fas fa-times mr-2"></i>Decline & Exit
                </button>
                <button id="acceptRulesBtn" class="flex-1 bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 rounded-lg hover:from-green-700 hover:to-blue-700 transition-colors font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                    <i class="fas fa-check mr-2"></i>Accept & Start Exam
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(rulesModal);

    const agreeCheckbox = document.getElementById('agreeRules');
    const acceptBtn = document.getElementById('acceptRulesBtn');
    const declineBtn = document.getElementById('declineRulesBtn');

    agreeCheckbox.addEventListener('change', () => {
        acceptBtn.disabled = !agreeCheckbox.checked;
    });

    acceptBtn.addEventListener('click', () => {
        if (agreeCheckbox.checked) {
            rulesModal.remove();
            if (onAccept) onAccept();
        }
    });

    declineBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to exit? You will be redirected to the subject selection page.')) {
            window.location.href = 'exam-mode-subjects.html';
        }
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AntiCheatSystem, showExamRules };
}
