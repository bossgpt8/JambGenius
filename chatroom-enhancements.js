// Chatroom Enhancements - User presence, typing indicators, reactions
import { db, auth } from './firebase-init.js';
import { collection, doc, setDoc, deleteDoc, updateDoc, query, where, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class ChatroomEnhancements {
  constructor() {
    this.currentUser = null;
    this.onlineUsers = new Map();
    this.typingUsers = new Set();
    this.userPresenceUnsubscribe = null;
    this.userTypingUnsubscribe = null;
  }

  // Initialize user presence tracking
  initializePresence(user) {
    if (!user) return;
    
    this.currentUser = user;
    
    // Set user as online
    this.setUserOnline(user);
    
    // Track online users
    this.trackOnlineUsers();
    
    // Handle user going offline
    window.addEventListener('beforeunload', () => {
      this.setUserOffline(user);
    });
  }

  // Set user as online
  async setUserOnline(user) {
    try {
      const userPresenceRef = doc(db, 'userPresence', user.uid);
      await setDoc(userPresenceRef, {
        uid: user.uid,
        displayName: user.displayName || user.email.split('@')[0],
        email: user.email,
        photoURL: user.photoURL || '',
        onlineAt: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Error setting user online:', error);
    }
  }

  // Set user as offline
  async setUserOffline(user) {
    try {
      const userPresenceRef = doc(db, 'userPresence', user.uid);
      await deleteDoc(userPresenceRef);
    } catch (error) {
      console.error('Error setting user offline:', error);
    }
  }

  // Track online users in real-time
  trackOnlineUsers() {
    const usersCollection = collection(db, 'userPresence');
    
    this.userPresenceUnsubscribe = onSnapshot(usersCollection, (snapshot) => {
      this.onlineUsers.clear();
      snapshot.forEach((doc) => {
        this.onlineUsers.set(doc.id, doc.data());
      });
      
      // Update UI
      this.updateOnlineUsersList();
    });
  }

  // Update online users list in UI
  updateOnlineUsersList() {
    const onlineCountEl = document.getElementById('onlineCount');
    const onlineUsersListEl = document.getElementById('onlineUsersList');
    
    if (onlineCountEl) {
      onlineCountEl.textContent = this.onlineUsers.size;
    }
    
    if (onlineUsersListEl) {
      onlineUsersListEl.innerHTML = '';
      
      if (this.onlineUsers.size === 0) {
        onlineUsersListEl.innerHTML = '<p class="text-sm text-gray-500 p-4 text-center">No users online</p>';
        return;
      }
      
      this.onlineUsers.forEach((user) => {
        const userEl = document.createElement('div');
        userEl.className = 'flex items-center gap-2 p-3 border-b border-gray-200 hover:bg-gray-50 transition-colors';
        userEl.innerHTML = `
          <div class="w-2 h-2 bg-green-500 rounded-full"></div>
          <img src="${user.photoURL || 'https://via.placeholder.com/32'}" alt="${user.displayName}" class="w-6 h-6 rounded-full">
          <span class="text-sm font-medium text-gray-900 truncate">${user.displayName}</span>
        `;
        onlineUsersListEl.appendChild(userEl);
      });
    }
  }

  // Show typing indicator
  async showTyping() {
    if (!this.currentUser) return;
    
    try {
      const typingRef = doc(db, 'typing', this.currentUser.uid);
      await setDoc(typingRef, {
        uid: this.currentUser.uid,
        displayName: this.currentUser.displayName || 'User',
        typingAt: new Date().toISOString()
      });
      
      // Remove typing indicator after 3 seconds of inactivity
      setTimeout(() => {
        deleteDoc(typingRef).catch(err => console.error('Error removing typing indicator:', err));
      }, 3000);
    } catch (error) {
      console.error('Error showing typing indicator:', error);
    }
  }

  // Track typing users
  trackTypingUsers() {
    const typingCollection = collection(db, 'typing');
    
    this.userTypingUnsubscribe = onSnapshot(typingCollection, (snapshot) => {
      this.typingUsers.clear();
      snapshot.forEach((doc) => {
        if (doc.id !== this.currentUser?.uid) {
          this.typingUsers.add(doc.data().displayName);
        }
      });
      
      // Update UI
      this.updateTypingIndicator();
    });
  }

  // Update typing indicator in UI
  updateTypingIndicator() {
    const typingIndicatorEl = document.getElementById('typingIndicator');
    
    if (typingIndicatorEl) {
      if (this.typingUsers.size === 0) {
        typingIndicatorEl.innerHTML = '';
        return;
      }
      
      const users = Array.from(this.typingUsers).slice(0, 2).join(', ');
      const suffix = this.typingUsers.size > 2 ? ` +${this.typingUsers.size - 2} more` : '';
      
      typingIndicatorEl.innerHTML = `
        <div class="text-sm text-gray-500 italic p-2">
          <i class="fas fa-circle-notch animate-spin mr-1"></i>
          ${users}${suffix} ${this.typingUsers.size === 1 ? 'is' : 'are'} typing...
        </div>
      `;
    }
  }

  // Add reaction to message
  async addReaction(messageId, emoji) {
    if (!this.currentUser) return;
    
    try {
      const reactionsRef = doc(db, 'messageReactions', messageId);
      const reactionKey = `${emoji}_${this.currentUser.uid}`;
      
      await updateDoc(reactionsRef, {
        [reactionKey]: true,
        [`${emoji}_count`]: new firebase.firestore.FieldValue.increment(1),
        updatedAt: new Date().toISOString()
      }).catch(() => {
        // If document doesn't exist, create it
        return setDoc(reactionsRef, {
          messageId: messageId,
          [reactionKey]: true,
          [`${emoji}_count`]: 1,
          createdAt: new Date().toISOString()
        });
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  }

  // Cleanup
  cleanup() {
    if (this.userPresenceUnsubscribe) {
      this.userPresenceUnsubscribe();
    }
    if (this.userTypingUnsubscribe) {
      this.userTypingUnsubscribe();
    }
    if (this.currentUser) {
      this.setUserOffline(this.currentUser);
    }
  }
}

export const chatroomEnhancements = new ChatroomEnhancements();
