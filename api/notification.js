// Push Notification API - Send notifications to users
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    return handlePostRequest(req, res);
  } else if (req.method === 'GET') {
    return handleGetRequest(req, res);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

async function handlePostRequest(req, res) {
  const { action, userId, fcmToken, title, body, type, deepLink } = req.body;

  // Register FCM token for a user
  if (action === 'register-token') {
    if (!userId || !fcmToken) {
      return res.status(400).json({ error: 'userId and fcmToken are required' });
    }

    try {
      // In production, store this in a database with Firebase
      console.log(`📱 FCM Token registered for user ${userId}`);
      
      return res.status(200).json({
        success: true,
        message: 'FCM token registered successfully'
      });
    } catch (error) {
      console.error('Error registering FCM token:', error);
      return res.status(500).json({ error: 'Failed to register token' });
    }
  }

  // Send notification to a user
  if (action === 'send') {
    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'userId, title, and body are required' });
    }

    try {
      // In production, use Firebase Cloud Messaging
      console.log(`📬 Sending notification to ${userId}:`, { title, body, type });
      
      return res.status(200).json({
        success: true,
        message: 'Notification queued for delivery'
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      return res.status(500).json({ error: 'Failed to send notification' });
    }
  }

  // Send broadcast notification to all users
  if (action === 'broadcast') {
    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }

    try {
      console.log(`📢 Broadcasting notification to all users:`, { title, body });
      
      return res.status(200).json({
        success: true,
        message: 'Broadcast notification queued'
      });
    } catch (error) {
      console.error('Error broadcasting notification:', error);
      return res.status(500).json({ error: 'Failed to broadcast notification' });
    }
  }

  return res.status(400).json({ error: 'Invalid action' });
}

async function handleGetRequest(req, res) {
  const { action } = req.query;

  // Get notification preferences for a user
  if (action === 'preferences') {
    return res.status(200).json({
      reminders: true,
      chat: true,
      exams: true,
      streaks: true
    });
  }

  return res.status(400).json({ error: 'Invalid action' });
}
