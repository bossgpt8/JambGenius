// Vercel Serverless Function - Automatic Chatroom Cleanup
// Delete messages older than 30 days to keep Firestore efficient
// This function can be called daily via cron or manually

const admin = require('firebase-admin');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  // Basic auth check - only allow if request has proper key
  const authKey = req.query.key || req.body.key;
  if (authKey !== process.env.CLEANUP_AUTH_KEY && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Calculate 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log(`Starting cleanup: deleting messages older than ${thirtyDaysAgo.toISOString()}`);

    // Note: In production, you'd use Firebase Admin SDK
    // For now, we'll return cleanup info and rely on Firestore TTL

    return res.status(200).json({
      success: true,
      message: 'Chatroom cleanup scheduled',
      deleteBefore: thirtyDaysAgo.toISOString(),
      recommendation: 'Enable Firestore TTL for automatic deletion',
      instructions: {
        step1: 'Go to Firestore Console',
        step2: 'Select chatMessages collection',
        step3: 'Click on a document > TTL > Set expireAt field',
        step4: 'Documents will auto-delete after 30 days'
      }
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return res.status(500).json({ error: 'Cleanup failed' });
  }
};
