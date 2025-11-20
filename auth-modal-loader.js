let modalLoaded = false;
let loadPromise = null;
let hcaptchaLoaded = false;

function loadHcaptchaScript() {
    return new Promise((resolve, reject) => {
        if (hcaptchaLoaded || typeof hcaptcha !== 'undefined') {
            hcaptchaLoaded = true;
            resolve();
            return;
        }

        if (document.querySelector('script[src*="hcaptcha"]')) {
            const checkInterval = setInterval(() => {
                if (typeof hcaptcha !== 'undefined') {
                    clearInterval(checkInterval);
                    hcaptchaLoaded = true;
                    resolve();
                }
            }, 100);
            setTimeout(() => {
                clearInterval(checkInterval);
                if (typeof hcaptcha !== 'undefined') {
                    hcaptchaLoaded = true;
                    resolve();
                } else {
                    reject(new Error('hCaptcha script failed to load'));
                }
            }, 10000);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://js.hcaptcha.com/1/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            const checkLoaded = setInterval(() => {
                if (typeof hcaptcha !== 'undefined') {
                    clearInterval(checkLoaded);
                    hcaptchaLoaded = true;
                    resolve();
                }
            }, 50);
            setTimeout(() => {
                clearInterval(checkLoaded);
                if (typeof hcaptcha !== 'undefined') {
                    hcaptchaLoaded = true;
                    resolve();
                } else {
                    reject(new Error('hCaptcha not available after script load'));
                }
            }, 3000);
        };
        script.onerror = () => reject(new Error('Failed to load hCaptcha script'));
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
    
    loadPromise = loadHcaptchaScript()
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
