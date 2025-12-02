// Splash Screen Manager - Only shows in app wrapper, only once per session
class SplashScreen {
    constructor() {
        this.splashElement = document.getElementById('splashScreen');
        this.body = document.body;
        this.init();
    }

    init() {
        if (!this.splashElement) return;

        const isInApp = this.checkIfInApp();
        const hasShownSplash = sessionStorage.getItem('jambgenius_splash_shown') === 'true';
        
        const mainContent = document.getElementById('mainContent');
        
        if (!isInApp || hasShownSplash) {
            this.splashElement.style.display = 'none';
            if (mainContent) {
                mainContent.classList.remove('splash-hidden');
                mainContent.style.opacity = '1';
            }
            return;
        }

        sessionStorage.setItem('jambgenius_splash_shown', 'true');
        
        this.splashElement.style.display = 'flex';
        
        if (mainContent) {
            mainContent.classList.add('splash-hidden');
            mainContent.style.opacity = '0';
        }

        setTimeout(() => {
            this.splashElement.style.animation = 'fadeOutSplash 0.5s ease-out forwards';
            
            setTimeout(() => {
                this.splashElement.style.display = 'none';
                if (mainContent) {
                    mainContent.classList.remove('splash-hidden');
                    mainContent.style.opacity = '1';
                }
            }, 500);
        }, 3000);
    }

    checkIfInApp() {
        const appFlag = localStorage.getItem('isInApp');
        const isWebView = /webview|wv|version\/[\d.]+.*version.*safari|;wv\)/i.test(navigator.userAgent);
        
        if (appFlag === 'true' || isWebView) {
            localStorage.setItem('isInApp', 'true');
            return true;
        }
        
        return false;
    }
}

(function() {
    const splashElement = document.getElementById('splashScreen');
    const mainContent = document.getElementById('mainContent');
    
    if (splashElement && mainContent) {
        const isInApp = localStorage.getItem('isInApp') === 'true' || 
                       /webview|wv|version\/[\d.]+.*version.*safari|;wv\)/i.test(navigator.userAgent);
        const hasShownSplash = sessionStorage.getItem('jambgenius_splash_shown') === 'true';
        
        if (isInApp && !hasShownSplash) {
            splashElement.style.display = 'flex';
            mainContent.style.opacity = '0';
        } else {
            splashElement.style.display = 'none';
            mainContent.style.opacity = '1';
        }
    }
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new SplashScreen());
} else {
    new SplashScreen();
}
