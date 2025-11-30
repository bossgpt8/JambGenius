// Global button loader for showing loading spinners during navigation
export function initButtonLoaders() {
    document.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        
        // Check if button has a loading spinner
        const spinner = button.querySelector('.loading-spinner');
        const buttonText = button.querySelector('.button-text');
        
        if (!spinner || !buttonText) return;
        
        // Don't show spinner for certain buttons (like toggles, modals, etc)
        if (button.classList.contains('no-loader')) return;
        
        // Show spinner and hide text briefly for user feedback
        spinner.classList.remove('hidden');
        buttonText.classList.add('hidden');
        
        // Reset after navigation (in case navigation fails)
        setTimeout(() => {
            if (!spinner.classList.contains('hidden')) {
                spinner.classList.add('hidden');
                buttonText.classList.remove('hidden');
            }
        }, 3000);
    });
}

// Show loading on specific button
export function showButtonLoading(buttonId) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    const spinner = button.querySelector('.loading-spinner');
    const buttonText = button.querySelector('.button-text');
    
    if (spinner && buttonText) {
        spinner.classList.remove('hidden');
        buttonText.classList.add('hidden');
    }
}

// Hide loading on specific button
export function hideButtonLoading(buttonId) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    const spinner = button.querySelector('.loading-spinner');
    const buttonText = button.querySelector('.button-text');
    
    if (spinner && buttonText) {
        spinner.classList.add('hidden');
        buttonText.classList.remove('hidden');
    }
}
