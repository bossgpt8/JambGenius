import { auth, db } from './firebase-init.js';
import { 
    signInWithPopup, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    sendPasswordResetEmail, 
    GoogleAuthProvider,
    updateProfile 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { loadAuthModal } from './auth-modal-loader.js';
import { initPasswordValidator } from './password-validator.js';

const provider = new GoogleAuthProvider();

let elements = null;
let initialized = false;

function initElements() {
    elements = {
        authModal: document.getElementById('authModal'),
        signInForm: document.getElementById('signInForm'),
        signUpForm: document.getElementById('signUpForm'),
        forgotPasswordForm: document.getElementById('forgotPasswordForm'),
        closeAuthModal: document.getElementById('closeAuthModal'),
        signInBtn: document.getElementById('signInBtn') || document.getElementById('authBtn'),
        googleSignIn: document.getElementById('googleSignIn'),
        googleSignUpBtn: document.getElementById('googleSignUpBtn'),
        emailSignInBtn: document.getElementById('emailSignInBtn'),
        emailSignUpBtn: document.getElementById('emailSignUpBtn'),
        sendResetEmailBtn: document.getElementById('sendResetEmailBtn'),
        showSignUpForm: document.getElementById('showSignUpForm'),
        showSignInForm: document.getElementById('showSignInForm'),
        forgotPasswordLink: document.getElementById('forgotPasswordLink'),
        backToSignIn: document.getElementById('backToSignIn')
    };
}

export function showAuthModal() {
    if (!elements) initElements();
    if (elements.authModal) {
        elements.authModal.classList.remove('hidden');
        if (elements.emailSignInBtn) elements.emailSignInBtn.disabled = true;
        if (elements.emailSignUpBtn) elements.emailSignUpBtn.disabled = true;
        
        // Prevent accidental close from initial click
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                hideAuthModal();
            }
        };
        
        setTimeout(() => {
            initializeHcaptcha();
            document.addEventListener('keydown', handleEscape);
            setTimeout(() => {
                if (elements.emailSignInBtn) elements.emailSignInBtn.disabled = false;
                if (elements.emailSignUpBtn) elements.emailSignUpBtn.disabled = false;
            }, 300);
        }, 200);
    }
}

function hideAuthModal() {
    if (!elements) initElements();
    if (elements.authModal) {
        elements.authModal.classList.add('hidden');
        showSignInFormView();
        // Remove escape key listener
        document.removeEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                hideAuthModal();
            }
        });
    }
}

function showSignInFormView() {
    if (!elements) initElements();
    if (elements.signInForm) elements.signInForm.classList.remove('hidden');
    if (elements.signUpForm) elements.signUpForm.classList.add('hidden');
    if (elements.forgotPasswordForm) elements.forgotPasswordForm.classList.add('hidden');
    if (elements.emailSignInBtn) elements.emailSignInBtn.disabled = true;
    setTimeout(() => {
        initializeHcaptcha();
        setTimeout(() => {
            if (elements.emailSignInBtn) elements.emailSignInBtn.disabled = false;
        }, 300);
    }, 200);
}

function showSignUpFormView() {
    if (!elements) initElements();
    if (elements.signInForm) elements.signInForm.classList.add('hidden');
    if (elements.signUpForm) elements.signUpForm.classList.remove('hidden');
    if (elements.forgotPasswordForm) elements.forgotPasswordForm.classList.add('hidden');
    if (elements.emailSignUpBtn) elements.emailSignUpBtn.disabled = true;
    setTimeout(() => {
        initializeHcaptcha();
        setTimeout(() => {
            if (elements.emailSignUpBtn) elements.emailSignUpBtn.disabled = false;
        }, 300);
    }, 200);
}

function showForgotPasswordFormView() {
    if (!elements) initElements();
    if (elements.signInForm) elements.signInForm.classList.add('hidden');
    if (elements.signUpForm) elements.signUpForm.classList.add('hidden');
    if (elements.forgotPasswordForm) elements.forgotPasswordForm.classList.remove('hidden');
}

async function verifyCaptcha(token) {
    try {
        const response = await fetch('/api/verify-captcha', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token })
        });

        const responseText = await response.text();
        let result;
        
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse verification response:', responseText);
            return { success: false };
        }

        return result;
    } catch (error) {
        console.error('Error verifying:', error);
        return { success: false };
    }
}

async function createUserDocument(user) {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
        await setDoc(userRef, {
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL || '',
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
        });
    } else {
        await updateDoc(userRef, {
            lastLogin: serverTimestamp()
        });
    }
}

async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, provider);
        await createUserDocument(result.user);
        console.log('Signed in:', result.user.email);
        hideAuthModal();
    } catch (error) {
        console.error('Error signing in:', error);
        customModal.error('Sign in failed. Please try again.', 'Sign In Error');
    }
}

async function signInWithEmail() {
    const email = document.getElementById('signInEmail').value;
    const password = document.getElementById('signInPassword').value;

    if (!email || !password) {
        customModal.error('Please enter both email and password');
        return;
    }

    if (typeof hcaptcha === 'undefined' || !window.signInHcaptchaId) {
        customModal.alert('Verification is still loading. Please wait a moment and try again.', 'Please Wait');
        return;
    }

    const hcaptchaResponse = hcaptcha.getResponse(window.signInHcaptchaId);
    if (!hcaptchaResponse) {
        customModal.error('Please complete the verification');
        return;
    }

    try {
        const verifyResult = await verifyCaptcha(hcaptchaResponse);
        if (!verifyResult.success) {
            customModal.error('Verification failed. Please try again.', 'Verification Error');
            hcaptcha.reset(window.signInHcaptchaId);
            return;
        }

        await signInWithEmailAndPassword(auth, email, password);
        hideAuthModal();
    } catch (error) {
        console.error('Error signing in:', error);
        hcaptcha.reset(window.signInHcaptchaId);
        if (error.code === 'auth/user-not-found') {
            customModal.error('No account found with this email. Please sign up first.', 'Account Not Found');
        } else if (error.code === 'auth/wrong-password') {
            customModal.error('Incorrect password. Please try again.', 'Incorrect Password');
        } else if (error.code === 'auth/invalid-email') {
            customModal.error('Invalid email address.', 'Invalid Email');
        } else {
            customModal.error('Sign in failed: ' + error.message, 'Sign In Error');
        }
    }
}

async function signUpWithEmail() {
    const name = document.getElementById('signUpName').value;
    const email = document.getElementById('signUpEmail').value;
    const password = document.getElementById('signUpPassword').value;
    const agreeToTerms = document.getElementById('agreeToTerms');

    if (!name || !email || !password) {
        customModal.error('Please fill in all fields');
        return;
    }

    // Validate password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/;
    if (!passwordRegex.test(password)) {
        customModal.error('Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 special character', 'Weak Password');
        return;
    }

    if (agreeToTerms && !agreeToTerms.checked) {
        customModal.error('You must agree to the Terms of Service and Privacy Policy to create an account', 'Terms Required');
        return;
    }

    if (password.length < 6) {
        customModal.error('Password must be at least 6 characters long', 'Weak Password');
        return;
    }

    if (typeof hcaptcha === 'undefined' || !window.signUpHcaptchaId) {
        customModal.alert('Verification is still loading. Please wait a moment and try again.', 'Please Wait');
        return;
    }

    const hcaptchaResponse = hcaptcha.getResponse(window.signUpHcaptchaId);
    if (!hcaptchaResponse) {
        customModal.error('Please complete the verification');
        return;
    }

    try {
        const verifyResult = await verifyCaptcha(hcaptchaResponse);
        if (!verifyResult.success) {
            customModal.error('Verification failed. Please try again.', 'Verification Error');
            hcaptcha.reset(window.signUpHcaptchaId);
            return;
        }

        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });
        await createUserDocument(result.user);
        hideAuthModal();
    } catch (error) {
        console.error('Error signing up:', error);
        hcaptcha.reset(window.signUpHcaptchaId);
        if (error.code === 'auth/email-already-in-use') {
            customModal.error('This email is already registered. Please sign in instead.', 'Email Already In Use');
        } else if (error.code === 'auth/invalid-email') {
            customModal.error('Invalid email address.', 'Invalid Email');
        } else if (error.code === 'auth/weak-password') {
            customModal.error('Password is too weak. Please use a stronger password.', 'Weak Password');
        } else {
            customModal.error('Sign up failed: ' + error.message, 'Sign Up Error');
        }
    }
}

async function resetPassword() {
    const email = document.getElementById('resetEmail').value;

    if (!email) {
        customModal.error('Please enter your email address');
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        await customModal.success('Password reset email sent! Please check your inbox.', 'Email Sent');
        showSignInFormView();
    } catch (error) {
        console.error('Error sending reset email:', error);
        if (error.code === 'auth/user-not-found') {
            customModal.error('No account found with this email.', 'Account Not Found');
        } else if (error.code === 'auth/invalid-email') {
            customModal.error('Invalid email address.', 'Invalid Email');
        } else {
            customModal.error('Failed to send reset email: ' + error.message, 'Error');
        }
    }
}

function initializeHcaptcha() {
    if (typeof hcaptcha === 'undefined' || typeof CONFIG === 'undefined') {
        console.warn('hCaptcha or CONFIG not yet available, retrying...');
        setTimeout(initializeHcaptcha, 100);
        return;
    }

    try {
        const signInHcaptchaElement = document.getElementById('signInHcaptcha');
        const signUpHcaptchaElement = document.getElementById('signUpHcaptcha');

        if (signInHcaptchaElement) {
            if (window.signInHcaptchaId !== undefined) {
                try {
                    hcaptcha.remove(window.signInHcaptchaId);
                } catch (e) {
                    console.log('Could not remove existing sign-in widget:', e);
                }
            }
            signInHcaptchaElement.setAttribute('data-sitekey', CONFIG.hcaptcha.siteKey);
            window.signInHcaptchaId = hcaptcha.render('signInHcaptcha', {
                sitekey: CONFIG.hcaptcha.siteKey,
                theme: 'light'
            });
        }

        if (signUpHcaptchaElement) {
            if (window.signUpHcaptchaId !== undefined) {
                try {
                    hcaptcha.remove(window.signUpHcaptchaId);
                } catch (e) {
                    console.log('Could not remove existing sign-up widget:', e);
                }
            }
            signUpHcaptchaElement.setAttribute('data-sitekey', CONFIG.hcaptcha.siteKey);
            window.signUpHcaptchaId = hcaptcha.render('signUpHcaptcha', {
                sitekey: CONFIG.hcaptcha.siteKey,
                theme: 'light'
            });
        }
        console.log('hCaptcha widgets initialized successfully');
    } catch (error) {
        console.error('Error initializing hCaptcha widgets:', error);
    }
}

export function initializeAuthModal() {
    if (initialized) return;
    
    initElements();
    
    if (!elements.authModal) return;

    initializeHcaptcha();

    if (elements.signInBtn) {
        elements.signInBtn.addEventListener('click', showAuthModal);
    }
    
    if (elements.googleSignIn) {
        elements.googleSignIn.addEventListener('click', signInWithGoogle);
    }
    
    if (elements.googleSignUpBtn) {
        elements.googleSignUpBtn.addEventListener('click', signInWithGoogle);
    }
    
    if (elements.emailSignInBtn) {
        elements.emailSignInBtn.addEventListener('click', signInWithEmail);
    }
    
    if (elements.emailSignUpBtn) {
        elements.emailSignUpBtn.addEventListener('click', signUpWithEmail);
    }
    
    if (elements.sendResetEmailBtn) {
        elements.sendResetEmailBtn.addEventListener('click', resetPassword);
    }
    
    if (elements.closeAuthModal) {
        elements.closeAuthModal.addEventListener('click', hideAuthModal);
    }
    
    if (elements.showSignUpForm) {
        elements.showSignUpForm.addEventListener('click', showSignUpFormView);
    }
    
    if (elements.showSignInForm) {
        elements.showSignInForm.addEventListener('click', showSignInFormView);
    }
    
    if (elements.forgotPasswordLink) {
        elements.forgotPasswordLink.addEventListener('click', showForgotPasswordFormView);
    }
    
    if (elements.backToSignIn) {
        elements.backToSignIn.addEventListener('click', showSignInFormView);
    }

    // Initialize password validator
    initPasswordValidator();

    if (elements.authModal) {
        // Remove old listeners first to prevent duplicates
        const oldOverlay = elements.authModal.cloneNode(false);
        
        // Prevent modal from closing when clicking inside the modal box
        const modalContent = elements.authModal.querySelector('.bg-white');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        // Close only when clicking on the background overlay - with proper event handling
        elements.authModal.addEventListener('click', (e) => {
            if (e.target === elements.authModal && elements.authModal.classList.contains('hidden') === false) {
                // Check if click is truly on overlay, not from event bubbling
                const modalBox = elements.authModal.querySelector('.bg-white');
                if (!modalBox || !modalBox.contains(e.target)) {
                    hideAuthModal();
                }
            }
        }, false);
    }
    
    initialized = true;
}

// Make it available globally for auth-modal-loader to call
if (typeof window !== 'undefined') {
    window.initializeAuthModal = initializeAuthModal;
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAuthModal);
    } else {
        initializeAuthModal();
    }
}
