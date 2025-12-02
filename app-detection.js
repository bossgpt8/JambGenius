/**
 * App Detection & Suggestion Popup
 * Shows mobile users a popup to download the JambGenius app from GitHub
 * Only shows if they're on mobile and NOT using the app
 * Only shows ONCE per session (first visit)
 */

class AppDetector {
    constructor() {
        this.isApp = this.detectApp();
        this.isMobile = this.detectMobile();
        this.popupDismissed = localStorage.getItem('jambgenius_popup_dismissed') === 'true';
        this.hasShownThisSession = sessionStorage.getItem('jambgenius_popup_shown_session') === 'true';
    }

    detectApp() {
        if (window.navigator.userAgent.includes('JambGenius')) {
            return true;
        }
        
        if (typeof window.androidBridge !== 'undefined') {
            return true;
        }
        
        if (window.navigator.userAgent.includes('wv')) {
            if (!window.navigator.userAgent.includes('Chrome')) {
                return true;
            }
        }
        
        const isInApp = localStorage.getItem('isInApp') === 'true';
        if (isInApp) {
            return true;
        }
        
        return false;
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        );
    }

    showPopup() {
        if (this.isApp || this.popupDismissed || !this.isMobile || this.hasShownThisSession) {
            return;
        }

        sessionStorage.setItem('jambgenius_popup_shown_session', 'true');
        this.hasShownThisSession = true;

        const popupHTML = `
            <div id="app-suggestion-overlay" class="fixed inset-0 bg-black bg-opacity-50 z-[999] flex items-end">
                <div class="w-full bg-white rounded-t-3xl p-6 animate-slide-up shadow-2xl">
                    <button onclick="appDetector.dismissPopup()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">
                        ×
                    </button>

                    <div class="text-center mb-6">
                        <div class="text-4xl mb-3">📱</div>
                        <h2 class="text-2xl font-bold text-gray-900">Get the JambGenius App</h2>
                        <p class="text-gray-600 mt-2">Faster • Offline • Better Experience</p>
                    </div>

                    <div class="space-y-3 mb-6">
                        <div class="flex items-start space-x-3">
                            <i class="fas fa-check-circle text-green-500 mt-1 text-lg"></i>
                            <div>
                                <p class="font-semibold text-gray-900">Lightning Fast</p>
                                <p class="text-sm text-gray-600">App loads instantly without internet</p>
                            </div>
                        </div>
                        <div class="flex items-start space-x-3">
                            <i class="fas fa-check-circle text-green-500 mt-1 text-lg"></i>
                            <div>
                                <p class="font-semibold text-gray-900">Offline Practice</p>
                                <p class="text-sm text-gray-600">Practice questions anywhere, anytime</p>
                            </div>
                        </div>
                        <div class="flex items-start space-x-3">
                            <i class="fas fa-check-circle text-green-500 mt-1 text-lg"></i>
                            <div>
                                <p class="font-semibold text-gray-900">Secure & Protected</p>
                                <p class="text-sm text-gray-600">Content protection & anti-cheating built-in</p>
                            </div>
                        </div>
                    </div>

                    <button onclick="appDetector.downloadApp()" class="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-3 rounded-xl mb-3 hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg">
                        <i class="fas fa-download mr-2"></i>Download Free APK
                    </button>

                    <button onclick="appDetector.dismissPopup()" class="w-full bg-gray-200 text-gray-800 font-semibold py-3 rounded-xl hover:bg-gray-300 transition-all">
                        Maybe Later
                    </button>
                    
                    <p class="text-xs text-center text-gray-500 mt-3">
                        <i class="fas fa-bars mr-1"></i> You can also download anytime from the menu (☰)
                    </p>

                    <p class="text-xs text-center text-gray-500 mt-2">
                        Free • No ads • Works offline • Direct download
                    </p>
                </div>
            </div>

            <style>
                @keyframes slide-up {
                    from {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', popupHTML);
        document.body.style.overflow = 'hidden';
    }

    downloadApp() {
        console.log('🚀 User clicked: Download App from GitHub Releases');
        
        try {
            const version = 'v1.0.0';
            const filename = 'JambGenius.apk';
            
            const downloadUrl = `/download/${version}/${filename}`;
            
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log(`✅ Download started from GitHub release: ${version}/${filename}`);
        } catch (error) {
            console.error('❌ Download failed:', error);
            alert('Failed to download app. Please try again.');
        }
        
        this.dismissPopup();
    }

    dismissPopup() {
        const overlay = document.getElementById('app-suggestion-overlay');
        if (overlay) {
            overlay.remove();
            document.body.style.overflow = 'auto';
        }

        localStorage.setItem('jambgenius_popup_dismissed', 'true');
        localStorage.setItem('jambgenius_popup_dismissed_at', new Date().getTime());
    }

    init() {
        setTimeout(() => {
            this.showPopup();
        }, 2000);

        console.log(`JambGenius App Detector: isMobile=${this.isMobile}, isApp=${this.isApp}, dismissed=${this.popupDismissed}`);
    }
}

window.appDetector = new AppDetector();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => appDetector.init());
} else {
    appDetector.init();
}
