// Viewport Manager - Switches between mobile and desktop view for exams
class ViewportManager {
    constructor() {
        this.isExamMode = false;
        this.originalViewport = null;
        this.originalZoom = null;
        this.init();
    }

    init() {
        // Check if currently in exam mode
        this.isExamMode = sessionStorage.getItem('examMode') === 'true';
        if (this.isExamMode) {
            this.setDesktopView();
        } else {
            this.setMobileView();
        }

        // Listen for page visibility
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isExamMode) {
                console.warn('⚠️ Exam paused - Window inactive');
            }
        });

        // Listen for beforeunload
        window.addEventListener('beforeunload', (e) => {
            if (this.isExamMode && !sessionStorage.getItem('examSubmitted')) {
                e.preventDefault();
                e.returnValue = 'Your exam progress will be lost. Are you sure?';
            }
        });
    }

    // Enter exam mode - switch to desktop view
    enterExamMode() {
        console.log('📱➜💻 Entering exam mode - switching to desktop view');
        this.isExamMode = true;
        sessionStorage.setItem('examMode', 'true');
        this.setDesktopView();
        
        // Prevent zoom and pinch
        document.addEventListener('gesturestart', (e) => {
            e.preventDefault();
        }, { passive: false });

        // Disable zoom on mobile
        document.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        // Disable right-click context menu
        document.addEventListener('contextmenu', (e) => {
            if (this.isExamMode) {
                e.preventDefault();
                return false;
            }
        });
    }

    // Exit exam mode - switch back to mobile view
    exitExamMode(submitted = false) {
        console.log('💻➜📱 Exiting exam mode - switching back to mobile view');
        this.isExamMode = false;
        sessionStorage.setItem('examMode', 'false');
        sessionStorage.setItem('examSubmitted', submitted ? 'true' : 'false');
        this.setMobileView();
    }

    // Set desktop viewport
    setDesktopView() {
        // Create or update viewport meta tag for desktop
        let viewportMeta = document.querySelector('meta[name="viewport"]');
        
        if (!viewportMeta) {
            viewportMeta = document.createElement('meta');
            viewportMeta.name = 'viewport';
            document.head.appendChild(viewportMeta);
        }

        // Store original for restoration
        this.originalViewport = viewportMeta.content;

        // Desktop viewport: no zoom, fixed at 100%
        viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

        // Add desktop-view class for CSS overrides
        document.documentElement.classList.add('desktop-exam-view');
        document.body.classList.add('desktop-exam-view');

        // Set zoom to 100%
        if (document.body.style.zoom) {
            this.originalZoom = document.body.style.zoom;
        }
        document.body.style.zoom = '100%';

        // Apply full viewport width CSS
        this.applyDesktopStyles();
    }

    // Set mobile viewport
    setMobileView() {
        // Restore original viewport
        let viewportMeta = document.querySelector('meta[name="viewport"]');
        
        if (!viewportMeta) {
            viewportMeta = document.createElement('meta');
            viewportMeta.name = 'viewport';
            document.head.appendChild(viewportMeta);
        }

        // Mobile viewport: allow zoom
        viewportMeta.content = 'width=device-width, initial-scale=1.0';

        // Remove desktop-view class
        document.documentElement.classList.remove('desktop-exam-view');
        document.body.classList.remove('desktop-exam-view');

        // Restore original zoom
        if (this.originalZoom) {
            document.body.style.zoom = this.originalZoom;
        } else {
            document.body.style.zoom = 'auto';
        }

        // Remove desktop styles
        this.removeDesktopStyles();
    }

    // Apply desktop-specific CSS
    applyDesktopStyles() {
        if (document.getElementById('exam-desktop-styles')) return;

        const style = document.createElement('style');
        style.id = 'exam-desktop-styles';
        style.textContent = `
            .desktop-exam-view {
                --exam-mode: true;
            }

            .desktop-exam-view .exam-interface {
                display: grid;
                grid-template-columns: 1fr 1fr;
                height: 100vh;
                gap: 0;
            }

            .desktop-exam-view .exam-sidebar {
                max-width: none;
                position: relative;
                max-height: none;
                border-right: 1px solid #e5e7eb;
            }

            .desktop-exam-view .exam-content {
                display: block;
                max-width: none;
            }

            .desktop-exam-view nav {
                position: relative;
                height: auto;
            }

            .desktop-exam-view body {
                overflow: hidden;
            }

            /* Prevent mobile menu in desktop exam view */
            .desktop-exam-view #mobileMenuBtn {
                display: none !important;
            }

            /* Full screen exam interface */
            .desktop-exam-view #examInterface {
                height: calc(100vh - 60px);
                overflow: hidden;
            }

            .desktop-exam-view .max-w-7xl {
                max-width: 100%;
            }

            /* Larger question text for desktop */
            .desktop-exam-view .question-text {
                font-size: 18px;
                line-height: 1.6;
            }

            /* Optimized calculator for desktop */
            .desktop-exam-view .calculator-container {
                width: 320px;
                max-height: 60vh;
            }

            /* Question navigator grid - 2 columns on desktop */
            .desktop-exam-view .question-navigator {
                display: grid;
                grid-template-columns: repeat(10, 1fr);
                gap: 4px;
            }

            @media (max-width: 1024px) {
                .desktop-exam-view .exam-interface {
                    grid-template-columns: 1fr;
                }

                .desktop-exam-view .exam-sidebar {
                    border-right: none;
                    border-bottom: 1px solid #e5e7eb;
                    max-height: 200px;
                    overflow-y: auto;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Remove desktop styles
    removeDesktopStyles() {
        const style = document.getElementById('exam-desktop-styles');
        if (style) {
            style.remove();
        }
    }

    // Check for exam rules agreement
    onExamRulesAgree() {
        console.log('✅ Exam rules accepted - entering full screen exam mode');
        this.enterExamMode();
    }

    // On exam back or exit
    onExamExit(submitted = false) {
        console.log('❌ Exam exited - returning to mobile view');
        this.exitExamMode(submitted);
    }

    // On exam submit
    onExamSubmitted() {
        console.log('🏁 Exam submitted - returning to mobile view');
        this.exitExamMode(true);
    }

    // Force landscape on mobile
    forceLandscape() {
        if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {
                console.log('Landscape lock not supported');
            });
        }
    }

    // Allow portrait again
    allowPortrait() {
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
    }
}

// Initialize globally
const viewportManager = new ViewportManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ViewportManager;
}
