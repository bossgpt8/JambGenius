import { auth, db } from './firebase-init.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export let currentUser = null;
export let userProfile = null;

const AUTH_STORAGE_KEY = 'jambgenius_auth_state';
const callbacks = [];
let isCheckingAuth = false;
let isShowingOverlay = false;
let hasShownWelcome = false;

function loadCachedAuthState() {
    try {
        const cached = sessionStorage.getItem(AUTH_STORAGE_KEY);
        if (cached) {
            const cachedData = JSON.parse(cached);
            userProfile = {
                displayName: cachedData.displayName,
                email: cachedData.email,
                photoURL: cachedData.photoURL
            };
            return true;
        }
    } catch (error) {
        console.error('Error loading cached auth:', error);
    }
    return false;
}

export function onAuthChange(callback) {
    callbacks.push(callback);
    if (currentUser) {
        callback(currentUser, userProfile);
    }
}

function showAuthCheckingOverlay() {
    if (document.getElementById('auth-checking-overlay')) return;
    
    isCheckingAuth = true;
    isShowingOverlay = true;
    
    const overlay = document.createElement('div');
    overlay.id = 'auth-checking-overlay';
    overlay.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-30 z-[9999] flex items-center justify-center">
            <div class="bg-white rounded-2xl p-6 shadow-2xl text-center max-w-sm mx-4 animate-fade-in">
                <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p class="text-gray-700 font-medium text-lg">Checking your account...</p>
                <p class="text-gray-500 text-sm mt-2">Please wait a moment</p>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    
    const authBtn = document.getElementById('authBtn') || document.getElementById('signInBtn');
    if (authBtn) {
        authBtn.disabled = true;
        authBtn.style.opacity = '0.5';
        authBtn.style.cursor = 'not-allowed';
    }
}

function hideAuthCheckingOverlay() {
    isCheckingAuth = false;
    isShowingOverlay = false;
    
    const overlay = document.getElementById('auth-checking-overlay');
    if (overlay) {
        overlay.remove();
    }
    
    const authBtn = document.getElementById('authBtn') || document.getElementById('signInBtn');
    if (authBtn) {
        authBtn.disabled = false;
        authBtn.style.opacity = '1';
        authBtn.style.cursor = 'pointer';
    }
}

function showWelcomeMessage(displayName) {
    if (hasShownWelcome || sessionStorage.getItem('jambgenius_welcome_shown') === 'true') return;
    hasShownWelcome = true;
    sessionStorage.setItem('jambgenius_welcome_shown', 'true');
    
    const firstName = displayName ? displayName.split(' ')[0] : 'Student';
    
    const welcomeMessages = [
        `Welcome back, ${firstName}! Ready to ace JAMB today?`,
        `Hey ${firstName}! Great to see you again. Let's crush some practice questions!`,
        `${firstName} is back! Your JAMB success journey continues.`,
        `Welcome, ${firstName}! Every practice session brings you closer to your dream score.`,
        `Good to have you back, ${firstName}! Let's make today count.`
    ];
    
    const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    
    const toast = document.createElement('div');
    toast.id = 'welcome-toast';
    toast.innerHTML = `
        <div class="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] animate-slide-down">
            <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 max-w-md">
                <div class="text-2xl">👋</div>
                <div>
                    <p class="font-semibold">${randomMessage}</p>
                </div>
            </div>
        </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slide-down {
            from { opacity: 0; transform: translate(-50%, -100%); }
            to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes slide-up {
            from { opacity: 1; transform: translate(-50%, 0); }
            to { opacity: 0; transform: translate(-50%, -100%); }
        }
        .animate-slide-down { animation: slide-down 0.4s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.4s ease-in forwards; }
        @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
    `;
    document.head.appendChild(style);
    document.body.appendChild(toast);
    
    setTimeout(() => {
        const toastElement = document.getElementById('welcome-toast');
        if (toastElement) {
            const inner = toastElement.querySelector('div');
            if (inner) {
                inner.classList.remove('animate-slide-down');
                inner.classList.add('animate-slide-up');
            }
            setTimeout(() => toastElement.remove(), 400);
        }
    }, 4000);
}

async function loadUserProfile(user) {
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            userProfile = userDoc.data();
        } else {
            userProfile = {
                displayName: user.displayName || user.email.split('@')[0],
                email: user.email,
                photoURL: user.photoURL || null,
                gender: null,
                age: null,
                bio: ''
            };
        }
        
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: userProfile.displayName,
            photoURL: userProfile.photoURL
        }));
    } catch (error) {
        console.error('Error loading user profile:', error);
        userProfile = {
            displayName: user.displayName || user.email.split('@')[0],
            email: user.email,
            photoURL: user.photoURL || null
        };
    }
}

onAuthStateChanged(auth, async (user) => {
    const wasCheckingAuth = isCheckingAuth;
    isCheckingAuth = false;
    
    hideAuthCheckingOverlay();
    
    if (user) {
        currentUser = user;
        
        const hasCached = loadCachedAuthState();
        if (hasCached) {
            updateNavigation();
        }
        
        await loadUserProfile(user);
        
        if (wasCheckingAuth && userProfile) {
            showWelcomeMessage(userProfile.displayName);
        }
    } else {
        currentUser = null;
        userProfile = null;
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }
    
    callbacks.forEach(cb => cb(currentUser, userProfile));
    updateNavigation();
});

function updateNavigation() {
    const userInfo = document.getElementById('userInfo');
    const userSection = document.getElementById('userSection');
    const authBtn = document.getElementById('authBtn') || document.getElementById('signInBtn');
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    
    if (currentUser && userProfile) {
        if (userInfo) {
            userInfo.classList.remove('hidden');
            userInfo.classList.add('flex');
        }
        if (userSection) {
            userSection.classList.remove('hidden');
            userSection.classList.add('flex');
        }
        if (authBtn) {
            authBtn.classList.add('hidden');
        }
        if (userName) {
            userName.textContent = userProfile.displayName;
        }
        if (userAvatar) {
            userAvatar.src = userProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.displayName)}&background=3b82f6&color=fff`;
        }
        
        const profileLinks = document.querySelectorAll('.profile-link');
        profileLinks.forEach(link => {
            link.classList.remove('hidden');
        });
    } else {
        if (userInfo) {
            userInfo.classList.add('hidden');
            userInfo.classList.remove('flex');
        }
        if (userSection) {
            userSection.classList.add('hidden');
            userSection.classList.remove('flex');
        }
        if (authBtn && !isShowingOverlay) {
            authBtn.classList.remove('hidden');
        }
        
        const profileLinks = document.querySelectorAll('.profile-link');
        profileLinks.forEach(link => {
            link.classList.add('hidden');
        });
    }
}

export async function handleSignOut() {
    if (confirm('Are you sure you want to sign out?')) {
        sessionStorage.removeItem('jambgenius_welcome_shown');
        await signOut(auth);
    }
}

function attachEventHandlers() {
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn && !signOutBtn.hasAttribute('data-listener-attached')) {
        signOutBtn.addEventListener('click', handleSignOut);
        signOutBtn.setAttribute('data-listener-attached', 'true');
    }
    
    const authBtn = document.getElementById('authBtn') || document.getElementById('signInBtn');
    if (authBtn && !authBtn.hasAttribute('data-listener-attached')) {
        authBtn.addEventListener('click', () => {
            if (!isShowingOverlay) {
                window.location.href = 'index.html#auth';
            }
        });
        authBtn.setAttribute('data-listener-attached', 'true');
    }
}

export function initializeAuthUI() {
    updateNavigation();
    attachEventHandlers();
}

if (typeof document !== 'undefined') {
    const hasCached = loadCachedAuthState();
    
    if (hasCached) {
        showAuthCheckingOverlay();
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (hasCached) {
                currentUser = { uid: 'cached' };
                updateNavigation();
                if (!document.getElementById('auth-checking-overlay')) {
                    showAuthCheckingOverlay();
                }
            }
            attachEventHandlers();
        });
    } else {
        if (hasCached) {
            currentUser = { uid: 'cached' };
            updateNavigation();
            if (!document.getElementById('auth-checking-overlay')) {
                showAuthCheckingOverlay();
            }
        }
        attachEventHandlers();
    }
}
