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
    }
}

function hideAuthModal() {
    if (!elements) initElements();
    if (elements.authModal) {
        elements.authModal.classList.add('hidden');
        showSignInFormView();
    }
}

function showSignInFormView() {
    if (!elements) initElements();
    if (elements.signInForm) elements.signInForm.classList.remove('hidden');
    if (elements.signUpForm) elements.signUpForm.classList.add('hidden');
    if (elements.forgotPasswordForm) elements.forgotPasswordForm.classList.add('hidden');
}

function showSignUpFormView() {
    if (!elements) initElements();
    if (elements.signInForm) elements.signInForm.classList.add('hidden');
    if (elements.signUpForm) elements.signUpForm.classList.remove('hidden');
    if (elements.forgotPasswordForm) elements.forgotPasswordForm.classList.add('hidden');
}

function showForgotPasswordFormView() {
    if (!elements) initElements();
    if (elements.signInForm) elements.signInForm.classList.add('hidden');
    if (elements.signUpForm) elements.signUpForm.classList.add('hidden');
    if (elements.forgotPasswordForm) elements.forgotPasswordForm.classList.remove('hidden');
}

async function verifyTurnstile(token) {
    try {
        const response = await fetch('/api/verify-turnstile', {
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
        alert('Sign in failed. Please try again.');
    }
}

async function signInWithEmail() {
    const email = document.getElementById('signInEmail').value;
    const password = document.getElementById('signInPassword').value;

    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }

    if (typeof turnstile === 'undefined' || !window.signInTurnstileId) {
        alert('Verification is still loading. Please wait a moment and try again.');
        return;
    }

    const turnstileResponse = turnstile.getResponse(window.signInTurnstileId);
    if (!turnstileResponse) {
        alert('Please complete the verification');
        return;
    }

    try {
        const verifyResult = await verifyTurnstile(turnstileResponse);
        if (!verifyResult.success) {
            alert('Verification failed. Please try again.');
            turnstile.reset(window.signInTurnstileId);
            return;
        }

        await signInWithEmailAndPassword(auth, email, password);
        hideAuthModal();
    } catch (error) {
        console.error('Error signing in:', error);
        turnstile.reset(window.signInTurnstileId);
        if (error.code === 'auth/user-not-found') {
            alert('No account found with this email. Please sign up first.');
        } else if (error.code === 'auth/wrong-password') {
            alert('Incorrect password. Please try again.');
        } else if (error.code === 'auth/invalid-email') {
            alert('Invalid email address.');
        } else {
            alert('Sign in failed: ' + error.message);
        }
    }
}

async function signUpWithEmail() {
    const name = document.getElementById('signUpName').value;
    const email = document.getElementById('signUpEmail').value;
    const password = document.getElementById('signUpPassword').value;
    const agreeToTerms = document.getElementById('agreeToTerms');

    if (!name || !email || !password) {
        alert('Please fill in all fields');
        return;
    }

    if (agreeToTerms && !agreeToTerms.checked) {
        alert('You must agree to the Terms of Service and Privacy Policy to create an account');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }

    if (typeof turnstile === 'undefined' || !window.signUpTurnstileId) {
        alert('Verification is still loading. Please wait a moment and try again.');
        return;
    }

    const turnstileResponse = turnstile.getResponse(window.signUpTurnstileId);
    if (!turnstileResponse) {
        alert('Please complete the verification');
        return;
    }

    try {
        const verifyResult = await verifyTurnstile(turnstileResponse);
        if (!verifyResult.success) {
            alert('Verification failed. Please try again.');
            turnstile.reset(window.signUpTurnstileId);
            return;
        }

        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });
        await createUserDocument(result.user);
        hideAuthModal();
    } catch (error) {
        console.error('Error signing up:', error);
        turnstile.reset(window.signUpTurnstileId);
        if (error.code === 'auth/email-already-in-use') {
            alert('This email is already registered. Please sign in instead.');
        } else if (error.code === 'auth/invalid-email') {
            alert('Invalid email address.');
        } else if (error.code === 'auth/weak-password') {
            alert('Password is too weak. Please use a stronger password.');
        } else {
            alert('Sign up failed: ' + error.message);
        }
    }
}

async function resetPassword() {
    const email = document.getElementById('resetEmail').value;

    if (!email) {
        alert('Please enter your email address');
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        alert('Password reset email sent! Please check your inbox.');
        showSignInFormView();
    } catch (error) {
        console.error('Error sending reset email:', error);
        if (error.code === 'auth/user-not-found') {
            alert('No account found with this email.');
        } else if (error.code === 'auth/invalid-email') {
            alert('Invalid email address.');
        } else {
            alert('Failed to send reset email: ' + error.message);
        }
    }
}

function initializeTurnstile() {
    if (typeof turnstile === 'undefined' || typeof CONFIG === 'undefined') {
        console.warn('Turnstile or CONFIG not yet available, retrying...');
        setTimeout(initializeTurnstile, 100);
        return;
    }

    try {
        const signInTurnstileElement = document.getElementById('signInTurnstile');
        const signUpTurnstileElement = document.getElementById('signUpTurnstile');

        if (signInTurnstileElement && !window.signInTurnstileId) {
            signInTurnstileElement.setAttribute('data-sitekey', CONFIG.turnstile.siteKey);
            window.signInTurnstileId = turnstile.render('#signInTurnstile', {
                sitekey: CONFIG.turnstile.siteKey,
                theme: 'light'
            });
        }

        if (signUpTurnstileElement && !window.signUpTurnstileId) {
            signUpTurnstileElement.setAttribute('data-sitekey', CONFIG.turnstile.siteKey);
            window.signUpTurnstileId = turnstile.render('#signUpTurnstile', {
                sitekey: CONFIG.turnstile.siteKey,
                theme: 'light'
            });
        }
        console.log('Turnstile widgets initialized successfully');
    } catch (error) {
        console.error('Error initializing Turnstile widgets:', error);
    }
}

export async function initializeAuthModal() {
    if (initialized) return;
    
    await loadAuthModal();
    initElements();
    
    if (!elements.authModal) return;

    initializeTurnstile();

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

    if (elements.authModal) {
        elements.authModal.addEventListener('click', (e) => {
            if (e.target === elements.authModal) {
                hideAuthModal();
            }
        });
    }
    
    initialized = true;
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAuthModal);
    } else {
        initializeAuthModal();
    }
}
