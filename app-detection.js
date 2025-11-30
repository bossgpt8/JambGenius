/**
 * App Detection & Suggestion Popup
 * Shows mobile users a popup to download the JambGenius app from GitHub
 * Only shows if they're on mobile and NOT using the app
 */

class AppDetector {
    constructor() {
        this.isApp = this.detectApp();
        this.isMobile = this.detectMobile();
        this.popupDismissed = localStorage.getItem('jambgenius_popup_dismissed') === 'true';
    }

    /**
     * Detects if user is accessing via the JambGenius mobile app
     */
    detectApp() {
        // Check if running inside Android WebView (JambGenius app)
        if (window.navigator.userAgent.includes('JambGenius')) {
            return true;
        }
        
        // Check for custom bridge object (if added in Android app)
        if (typeof window.androidBridge !== 'undefined') {
            return true;
        }
        
        // Check if WebView is present (Android)
        if (window.navigator.userAgent.includes('wv')) {
            // Additional check: if it's WebView but not Chrome, it's likely an app
            if (!window.navigator.userAgent.includes('Chrome')) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Detects if user is on mobile device
     */
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        );
    }

    /**
     * Shows the app suggestion popup
     */
    showPopup() {
        // Don't show if already using the app or popup was dismissed
        if (this.isApp || this.popupDismissed || !this.isMobile) {
            return;
        }

        // Create popup HTML
        const popupHTML = `
            <div id="app-suggestion-overlay" class="fixed inset-0 bg-black bg-opacity-50 z-[999] flex items-end">
                <div class="w-full bg-white rounded-t-3xl p-6 animate-slide-up shadow-2xl">
                    <!-- Close Button -->
                    <button onclick="appDetector.dismissPopup()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">
                        ×
                    </button>

                    <!-- Header -->
                    <div class="text-center mb-6">
                        <div class="text-4xl mb-3">📱</div>
                        <h2 class="text-2xl font-bold text-gray-900">Get the JambGenius App</h2>
                        <p class="text-gray-600 mt-2">Faster • Offline • Better Experience</p>
                    </div>

                    <!-- Benefits -->
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

                    <!-- Download Button -->
                    <button onclick="appDetector.downloadApp()" class="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-3 rounded-xl mb-3 hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg">
                        <i class="fas fa-download mr-2"></i>Download Free APK
                    </button>

                    <!-- Dismiss Button -->
                    <button onclick="appDetector.dismissPopup()" class="w-full bg-gray-200 text-gray-800 font-semibold py-3 rounded-xl hover:bg-gray-300 transition-all">
                        Maybe Later
                    </button>

                    <!-- Footer -->
                    <p class="text-xs text-center text-gray-500 mt-4">
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

        // Add popup to page
        document.body.insertAdjacentHTML('beforeend', popupHTML);

        // Prevent body scroll when popup is open
        document.body.style.overflow = 'hidden';
    }

    /**
     * Download the app APK directly from GitHub releases
     * Format: /download/v{version}/{filename}
     * Example: /download/v1.0.0/JambGenius.apk
     */
    downloadApp() {
        // User analytics
        console.log('🚀 User clicked: Download App from GitHub Releases');
        
        try {
            // IMPORTANT: Update these values when you create a GitHub release
            const version = 'v1.0.0';           // Change to your release version (e.g., v1.0.1, v2.0.0)
            const filename = 'JambGenius.apk';   // Change if you name your APK differently
            
            const downloadUrl = `/download/${version}/${filename}`;
            
            // Create download link
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
        
        // Dismiss popup after clicking download
        this.dismissPopup();
    }

    /**
     * Dismiss the popup and don't show again for 30 days
     */
    dismissPopup() {
        const overlay = document.getElementById('app-suggestion-overlay');
        if (overlay) {
            overlay.remove();
            document.body.style.overflow = 'auto';
        }

        // Store dismissal for 30 days
        localStorage.setItem('jambgenius_popup_dismissed', 'true');
        localStorage.setItem('jambgenius_popup_dismissed_at', new Date().getTime());

        // Check again in 30 days
        setTimeout(() => {
            localStorage.removeItem('jambgenius_popup_dismissed');
        }, 30 * 24 * 60 * 60 * 1000); // 30 days
    }

    /**
     * Initialize detection and show popup if needed
     */
    init() {
        // Show popup after a short delay (2 seconds) so user can read page content first
        setTimeout(() => {
            this.showPopup();
        }, 2000);

        // Debug info (remove in production if desired)
        console.log(`JambGenius App Detector: isMobile=${this.isMobile}, isApp=${this.isApp}, dismissed=${this.popupDismissed}`);
    }
}

// Create global instance
window.appDetector = new AppDetector();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => appDetector.init());
} else {
    appDetector.init();
}
