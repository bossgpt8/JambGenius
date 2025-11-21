// Real-time password validation for sign-up form
export function initPasswordValidator() {
    const passwordInput = document.getElementById('signUpPassword');
    if (!passwordInput) return;

    passwordInput.addEventListener('input', function() {
        const password = this.value;
        
        // Check password strength requirements
        const hasLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasSpecial = /[!@#$%^&*]/.test(password);

        // Update UI indicators
        updateIndicator('pwd-length', hasLength);
        updateIndicator('pwd-upper', hasUpper);
        updateIndicator('pwd-lower', hasLower);
        updateIndicator('pwd-special', hasSpecial);
    });
}

function updateIndicator(elementId, isValid) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (isValid) {
        element.classList.remove('border-gray-300', 'bg-white');
        element.classList.add('border-green-500', 'bg-green-500');
        element.innerHTML = '✓';
        element.style.color = 'white';
    } else {
        element.classList.remove('border-green-500', 'bg-green-500');
        element.classList.add('border-gray-300', 'bg-white');
        element.innerHTML = '';
    }
}
