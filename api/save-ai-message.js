// Save AI message to Firestore using Admin SDK (bypasses security rules)
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
  };
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
  });
}

const db = admin.firestore();

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { aiMessage } = req.body;

  if (!aiMessage) {
    return res.status(400).json({ error: 'aiMessage is required' });
  }

  try {
    const docRef = await db.collection('chatMessages').add({
      type: 'text',
      text: aiMessage,
      userId: 'ai-boss-system',
      displayName: 'JambGenius Boss',
      userEmail: 'boss@jambgenius.com',
      isAdmin: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString()
    });

    console.log('✅ AI message saved:', docRef.id);
    return res.status(200).json({ 
      success: true, 
      messageId: docRef.id,
      message: 'AI message saved successfully' 
    });
  } catch (error) {
    console.error('Error saving AI message:', error);
    return res.status(500).json({ error: 'Failed to save AI message' });
  }
};
