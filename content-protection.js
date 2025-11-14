// Content Protection Script
// Prevents copying, right-click, and text selection on the website

(function() {
    'use strict';
    
    // Helper function to check if element or parent is copyable
    function isCopyable(element) {
        if (!element) return false;
        // Check if element or any parent has 'copyable' class
        let el = element;
        while (el) {
            if (el.classList && el.classList.contains('copyable')) {
                return true;
            }
            el = el.parentElement;
        }
        return false;
    }
    
    // Disable right-click context menu
    document.addEventListener('contextmenu', function(e) {
        // Allow right-click on copyable elements
        if (isCopyable(e.target)) {
            return true;
        }
        e.preventDefault();
        showProtectionAlert('Right-click is disabled to protect our content');
        return false;
    });
    
    // Disable text selection with CSS
    const style = document.createElement('style');
    style.textContent = `
        body {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
        }
        
        img {
            -webkit-user-drag: none;
            -khtml-user-drag: none;
            -moz-user-drag: none;
            -o-user-drag: none;
            user-drag: none;
            pointer-events: none;
        }
        
        /* Allow text selection in input fields and copyable elements */
        input, textarea, .copyable, .copyable * {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }
    `;
    document.head.appendChild(style);
    
    // Disable keyboard shortcuts for copy, cut, paste, save, view source
    document.addEventListener('keydown', function(e) {
        // Allow copy shortcuts on copyable elements
        if (e.ctrlKey || e.metaKey) {
            const key = e.key.toLowerCase();
            if (['c', 'x', 'a'].includes(key) && isCopyable(e.target)) {
                return true;
            }
            if (['c', 'x', 'v', 'a', 's', 'u', 'p'].includes(key)) {
                e.preventDefault();
                showProtectionAlert('Keyboard shortcuts are disabled to protect our content');
                return false;
            }
        }
        
        // F12 (Developer tools)
        if (e.keyCode === 123) {
            e.preventDefault();
            showProtectionAlert('Developer tools are disabled');
            return false;
        }
        
        // Ctrl+Shift+I (Inspect element)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
            e.preventDefault();
            showProtectionAlert('Inspect element is disabled');
            return false;
        }
        
        // Ctrl+Shift+C (Inspect element)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
            e.preventDefault();
            return false;
        }
        
        // Ctrl+Shift+J (Console)
        if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
            e.preventDefault();
            return false;
        }
    });
    
    // Disable copy, cut, and paste events
    document.addEventListener('copy', function(e) {
        // Allow copying on copyable elements
        if (isCopyable(e.target)) {
            return true;
        }
        e.preventDefault();
        showProtectionAlert('Copying is disabled to protect our content');
        return false;
    });
    
    document.addEventListener('cut', function(e) {
        // Allow cutting on copyable elements
        if (isCopyable(e.target)) {
            return true;
        }
        e.preventDefault();
        showProtectionAlert('Cutting is disabled to protect our content');
        return false;
    });
    
    document.addEventListener('paste', function(e) {
        // Allow paste in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return true;
        }
        e.preventDefault();
        return false;
    });
    
    // Disable drag and drop
    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Disable selecting and highlighting text
    document.addEventListener('selectstart', function(e) {
        // Allow selection in input fields and copyable elements
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || isCopyable(e.target)) {
            return true;
        }
        e.preventDefault();
        return false;
    });
    
    // Alert notification for protection
    let alertTimeout;
    function showProtectionAlert(message) {
        // Clear previous timeout
        if (alertTimeout) {
            clearTimeout(alertTimeout);
        }
        
        // Remove existing alert
        const existingAlert = document.getElementById('protection-alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        // Create alert element
        const alert = document.createElement('div');
        alert.id = 'protection-alert';
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            z-index: 10000;
            font-family: 'Inter', sans-serif;
            font-size: 14px;
            font-weight: 500;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        
        alert.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fas fa-shield-alt" style="font-size: 20px;"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add animation keyframes
        if (!document.getElementById('protection-alert-style')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'protection-alert-style';
            styleSheet.textContent = `
                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(styleSheet);
        }
        
        document.body.appendChild(alert);
        
        // Auto remove after 3 seconds
        alertTimeout = setTimeout(() => {
            alert.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => alert.remove(), 300);
        }, 3000);
    }
    
    // Detect if DevTools is open (advanced protection)
    let devtoolsOpen = false;
    const detectDevTools = () => {
        const threshold = 160;
        if (window.outerWidth - window.innerWidth > threshold || 
            window.outerHeight - window.innerHeight > threshold) {
            if (!devtoolsOpen) {
                devtoolsOpen = true;
                showProtectionAlert('Developer tools detected!');
            }
        } else {
            devtoolsOpen = false;
        }
    };
    
    // Check for DevTools periodically
    setInterval(detectDevTools, 1000);
    
    // Disable Print Screen (doesn't work on all browsers but worth trying)
    document.addEventListener('keyup', function(e) {
        if (e.key === 'PrintScreen') {
            navigator.clipboard.writeText('');
            showProtectionAlert('Screenshots are discouraged');
        }
    });
    
    console.log('%c⚠️ Content Protection Active', 'color: #e74c3c; font-size: 20px; font-weight: bold;');
    console.log('%cThis website is protected against unauthorized copying and content theft.', 'color: #95a5a6; font-size: 14px;');
    console.log('%cAll content is © 2025 JambGenius. Unauthorized use is prohibited.', 'color: #95a5a6; font-size: 14px;');
    
})();
