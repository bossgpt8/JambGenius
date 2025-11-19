let modalLoaded = false;
let loadPromise = null;
let recaptchaLoaded = false;

function loadRecaptchaScript() {
    return new Promise((resolve, reject) => {
        if (recaptchaLoaded || typeof grecaptcha !== 'undefined') {
            recaptchaLoaded = true;
            resolve();
            return;
        }

        if (document.querySelector('script[src*="recaptcha"]')) {
            const checkInterval = setInterval(() => {
                if (typeof grecaptcha !== 'undefined') {
                    clearInterval(checkInterval);
                    recaptchaLoaded = true;
                    resolve();
                }
            }, 100);
            setTimeout(() => {
                clearInterval(checkInterval);
                if (typeof grecaptcha !== 'undefined') {
                    recaptchaLoaded = true;
                    resolve();
                } else {
                    reject(new Error('reCAPTCHA script failed to load'));
                }
            }, 10000);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://www.google.com/recaptcha/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            const checkLoaded = setInterval(() => {
                if (typeof grecaptcha !== 'undefined') {
                    clearInterval(checkLoaded);
                    recaptchaLoaded = true;
                    resolve();
                }
            }, 50);
            setTimeout(() => {
                clearInterval(checkLoaded);
                if (typeof grecaptcha !== 'undefined') {
                    recaptchaLoaded = true;
                    resolve();
                } else {
                    reject(new Error('grecaptcha not available after script load'));
                }
            }, 3000);
        };
        script.onerror = () => reject(new Error('Failed to load reCAPTCHA script'));
        document.head.appendChild(script);
    });
}

export async function loadAuthModal() {
    if (modalLoaded) {
        return Promise.resolve();
    }
    
    if (loadPromise) {
        return loadPromise;
    }
    
    if (document.getElementById('authModal')) {
        modalLoaded = true;
        return Promise.resolve();
    }
    
    loadPromise = loadRecaptchaScript()
        .then(() => fetch('/auth-modal.html'))
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load auth modal: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            const container = document.createElement('div');
            container.innerHTML = html;
            document.body.appendChild(container.firstElementChild);
            modalLoaded = true;
        })
        .catch(error => {
            console.error('Error loading auth modal:', error);
            loadPromise = null;
        });
    
    return loadPromise;
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadAuthModal);
    } else {
        loadAuthModal();
    }
}
