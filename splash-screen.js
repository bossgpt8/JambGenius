// Splash Screen Manager - Only shows in app wrapper
class SplashScreen {
    constructor() {
        this.splashElement = document.getElementById('splashScreen');
        this.mainContent = document.getElementById('mainContent');
        this.init();
    }

    init() {
        if (!this.splashElement) return;

        // Check if running in app wrapper
        const isInApp = this.checkIfInApp();
        
        if (!isInApp) {
            // Not in app - skip splash screen
            this.splashElement.style.display = 'none';
            this.mainContent.style.display = 'block';
            return;
        }

        // Show splash screen only in app
        this.splashElement.style.display = 'flex';
        this.mainContent.style.display = 'none';

        // Hide splash after 3 seconds and show main content
        setTimeout(() => {
            this.splashElement.style.animation = 'fadeOutSplash 0.5s ease-out forwards';
            
            setTimeout(() => {
                this.splashElement.style.display = 'none';
                this.mainContent.style.display = 'block';
                
                // Trigger fade-in animation for main content
                this.mainContent.style.animation = 'fadeInContent 0.6s ease-in forwards';
            }, 500);
        }, 3000);
    }

    checkIfInApp() {
        // Only show splash screen if explicitly in app mode
        // Check localStorage flag set by app wrapper
        const appFlag = localStorage.getItem('isInApp');
        
        // Check if it's a WebView app (Android APK or iOS app)
        const isWebView = /webview|wv|version\/[\d.]+.*version.*safari|;wv\)/i.test(navigator.userAgent);
        
        // Check if it's explicitly marked as app
        if (appFlag === 'true' || isWebView) {
            return true;
        }
        
        // Default: not in app (regular website)
        return false;
    }
}

// Initialize splash screen
document.addEventListener('DOMContentLoaded', () => {
    new SplashScreen();
});
