// Chatroom Media Handling - Images and Voice Notes
// Stores media as base64 directly in Firestore (no Firebase Storage billing needed)
import { db, auth } from './firebase-init.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

class ChatroomMedia {
  constructor() {
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.currentUser = null;
  }

  setCurrentUser(user) {
    this.currentUser = user;
  }

  // Compress image before storing
  compressImage(file, callback) {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Scale down if too large (max 800x600)
        if (width > 800 || height > 600) {
          const ratio = Math.min(800 / width, 600 / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG with quality 0.7
        callback(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
  }

  // Handle image upload
  async handleImageUpload(file) {
    if (!this.currentUser) {
      alert('Please sign in to send images');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    try {
      this.compressImage(file, async (compressedBase64) => {
        try {
          // Check base64 size (Firestore limit is 1MB per document)
          const sizeInMB = (compressedBase64.length * 3) / (4 * 1024 * 1024);
          if (sizeInMB > 0.9) {
            alert(`Image too large (${sizeInMB.toFixed(2)}MB). Please use a smaller image.`);
            return;
          }

          // Save reference to Firestore
          const docRef = await addDoc(collection(db, 'chatMessages'), {
            type: 'image',
            imageData: compressedBase64,
            imageName: file.name,
            userId: this.currentUser.uid,
            displayName: this.currentUser.displayName || this.currentUser.email.split('@')[0],
            userEmail: this.currentUser.email,
            isAdmin: false,
            timestamp: serverTimestamp(),
            createdAt: new Date().toISOString()
          });

          console.log('✅ Image sent successfully:', docRef.id);
        } catch (error) {
          console.error('❌ Error saving image to Firestore:', error);
          alert('Failed to send image: ' + error.message);
        }
      });
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Failed to process image. Please try again.');
    }
  }

  // Start voice recording
  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.isRecording = true;

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = async () => {
        await this.sendVoiceNote();
      };

      this.mediaRecorder.start();
      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
      return false;
    }
  }

  // Stop voice recording
  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }

  // Send voice note
  async sendVoiceNote() {
    if (!this.currentUser) {
      alert('Please sign in to send voice notes');
      return;
    }

    try {
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const base64Audio = event.target.result;

          // Check base64 size (Firestore limit is 1MB per document)
          const sizeInMB = (base64Audio.length * 3) / (4 * 1024 * 1024);
          if (sizeInMB > 0.9) {
            alert(`Voice note too large (${sizeInMB.toFixed(2)}MB). Please record a shorter clip.`);
            return;
          }

          // Save reference to Firestore
          const docRef = await addDoc(collection(db, 'chatMessages'), {
            type: 'voice',
            voiceData: base64Audio,
            userId: this.currentUser.uid,
            displayName: this.currentUser.displayName || this.currentUser.email.split('@')[0],
            userEmail: this.currentUser.email,
            isAdmin: false,
            timestamp: serverTimestamp(),
            createdAt: new Date().toISOString()
          });

          console.log('✅ Voice note sent successfully:', docRef.id);
          this.audioChunks = [];
        } catch (error) {
          console.error('❌ Error saving voice note to Firestore:', error);
          alert('Failed to send voice note: ' + error.message);
        }
      };

      reader.onerror = () => {
        console.error('Error reading audio file');
        alert('Failed to read voice note file.');
      };
      
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Error processing voice note:', error);
      alert('Failed to process voice note. Please try again.');
    }
  }

  // Check if recording
  getRecordingStatus() {
    return this.isRecording;
  }
}

export const chatroomMedia = new ChatroomMedia();
