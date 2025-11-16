import { auth, db } from './firebase-init.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

export let currentUser = null;
export let userProfile = null;

const AUTH_STORAGE_KEY = 'jambgenius_auth_state';
const callbacks = [];

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
    if (user) {
        currentUser = user;
        
        const hasCached = loadCachedAuthState();
        if (hasCached) {
            updateNavigation();
        }
        
        await loadUserProfile(user);
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
        if (authBtn) {
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
            window.location.href = 'index.html#auth';
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
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (hasCached) {
                currentUser = { uid: 'cached' };
                updateNavigation();
            }
            attachEventHandlers();
        });
    } else {
        if (hasCached) {
            currentUser = { uid: 'cached' };
            updateNavigation();
        }
        attachEventHandlers();
    }
}
