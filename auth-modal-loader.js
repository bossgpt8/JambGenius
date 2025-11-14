let modalLoaded = false;
let loadPromise = null;

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
    
    loadPromise = fetch('/auth-modal.html')
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
