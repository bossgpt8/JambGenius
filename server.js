require('dotenv').config();
const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname)));

// Initialize Firebase Admin for AI messages (for Vercel deployment)
let admin;
try {
  admin = require('firebase-admin');
  if (!admin.apps.length) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    };
    
    if (serviceAccount.projectId && serviceAccount.privateKey && serviceAccount.clientEmail) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase Admin initialized');
    }
  }
} catch (error) {
  console.log('⚠️ Firebase Admin not available - AI messages will use client SDK');
  admin = null;
}

app.post('/api/verify-captcha', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ success: false, error: 'Captcha token is required' });
  }

  const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY;
  
  if (!turnstileSecretKey) {
    console.warn('⚠️ Turnstile secret key not configured - allowing all requests for development');
    return res.json({ success: true });
  }
  
  try {
    const formData = new URLSearchParams();
    formData.append('secret', turnstileSecretKey);
    formData.append('response', token);
    
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    
    const result = await response.json();
    console.log('Turnstile verification response:', result);
    
    if (result.success) {
      return res.json({ success: true });
    } else {
      console.error('Turnstile verification failed:', result);
      return res.status(400).json({ 
        success: false, 
        error: 'Verification failed',
        errorCodes: result['error-codes']
      });
    }
  } catch (error) {
    console.error('Turnstile verification error:', error);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

app.post('/api/verify-payment', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  const { reference, email, fullName, expectedCredits, idToken } = req.body;
  
  console.log('Verifying payment:', { reference, email, fullName, expectedCredits, hasToken: !!idToken });
  
  if (!reference) {
    return res.status(400).json({ error: 'Payment reference is required' });
  }
  
  // Token verification is required to credit accounts
  let uid = null;
  if (idToken && admin && admin.apps.length) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      uid = decodedToken.uid;
      console.log('Verified user for payment:', uid);
    } catch (tokenError) {
      console.error('Token verification failed for payment:', tokenError.message);
      return res.status(401).json({ success: false, error: 'Invalid authentication token' });
    }
  } else if (!idToken) {
    return res.status(401).json({ success: false, error: 'Authentication required for payment verification' });
  }

  const credits = Number(expectedCredits) || 1;
  const PRICE_PER_CREDIT = 100000;
  const expectedAmount = credits * PRICE_PER_CREDIT;

  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  
  if (!paystackSecretKey) {
    console.error('PAYSTACK_SECRET_KEY is not configured!');
    return res.status(500).json({
      success: false,
      error: 'Payment system is not properly configured. Please contact support.'
    });
  }
  
  const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: `/transaction/verify/${reference}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${paystackSecretKey}`,
      'Content-Type': 'application/json'
    }
  };

  const verifyPaystack = () => new Promise((resolve, reject) => {
    const paystackRequest = https.request(options, (paystackRes) => {
      let data = '';
      paystackRes.on('data', (chunk) => data += chunk);
      paystackRes.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    });
    paystackRequest.on('error', reject);
    paystackRequest.end();
  });

  try {
    const result = await verifyPaystack();
    console.log('Paystack response:', JSON.stringify(result, null, 2));
    
    if (!result.status) {
      console.error('Paystack API returned status false:', result);
      return res.status(400).json({
        success: false,
        error: result.message || 'Payment verification failed with Paystack'
      });
    }
    
    if (!result.data) {
      console.error('Paystack response missing data:', result);
      return res.status(400).json({
        success: false,
        error: 'Invalid Paystack response - no transaction data'
      });
    }
    
    console.log('Transaction status:', result.data.status);
    
    if (result.data.status !== 'success') {
      console.error('Transaction not successful. Status:', result.data.status);
      return res.status(400).json({
        success: false,
        error: `Payment not successful. Transaction status: ${result.data.status || 'unknown'}`
      });
    }
    
    const amountDifference = Math.abs(result.data.amount - expectedAmount);
    const allowedVariance = Math.max(expectedAmount * 0.05, 50000);
    
    if (amountDifference > allowedVariance) {
      console.error(`Amount variance too high: expected ${expectedAmount}, got ${result.data.amount}`);
      return res.status(400).json({
        success: false,
        error: `Amount mismatch. Expected ₦${(expectedAmount / 100).toLocaleString()}, got ₦${(result.data.amount / 100).toLocaleString()}`
      });
    }
    
    if (uid && admin && admin.apps.length) {
      try {
        const db = admin.firestore();
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();
        
        const docExists = userDoc.exists;
        const docData = docExists ? userDoc.data() : {};
        const currentCredits = Number(docData.examCredits) || 0;
        
        const paymentEntry = {
          reference,
          amount: result.data.amount,
          currency: result.data.currency || 'NGN',
          credits,
          paidAt: new Date().toISOString()
        };
        
        const existingHistory = (docExists && Array.isArray(docData.paymentHistory)) 
          ? docData.paymentHistory 
          : [];
        const updatedHistory = [...existingHistory, paymentEntry];
        
        const newCredits = currentCredits + credits;
        
        await userRef.set({
          examCredits: newCredits,
          lastPaymentReference: reference,
          lastPaymentAt: new Date().toISOString(),
          lastPaymentAmount: result.data.amount,
          lastPaymentCurrency: result.data.currency || 'NGN',
          email,
          fullName,
          paymentHistory: updatedHistory,
          isServerUpdate: true
        }, { merge: true });
        
        console.log(`✅ Credits updated for user ${uid}: ${currentCredits} -> ${newCredits}`);
      } catch (firestoreError) {
        console.error('Firestore write error:', firestoreError);
      }
    }
    
    res.json({
      success: true,
      message: 'Payment verified and credits updated successfully',
      data: {
        reference: reference,
        amount: result.data.amount,
        currency: result.data.currency || 'NGN',
        email: result.data.customer?.email || email,
        fullName: fullName,
        credits: credits,
        paidAt: result.data.paid_at
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ success: false, error: 'Payment verification failed' });
  }
});

// Consume exam credit - called when starting an exam
app.post('/api/consume-credit', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { idToken } = req.body;
  
  if (!idToken) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  if (!admin || !admin.apps.length) {
    console.error('Firebase Admin not initialized');
    return res.status(500).json({ 
      success: false, 
      error: 'Server configuration error. Please try again later.' 
    });
  }
  
  let uid;
  try {
    // Verify the ID token and extract the uid - MANDATORY
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    uid = decodedToken.uid;
  } catch (tokenError) {
    console.error('Token verification failed:', tokenError.message);
    return res.status(401).json({ success: false, error: 'Invalid authentication token' });
  }
    
  try {
    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);
    
    // Use a transaction to ensure atomic credit consumption
    const result = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        throw new Error('USER_NOT_FOUND');
      }
      
      const userData = userDoc.data();
      const currentCredits = Number(userData.examCredits) || 0;
      
      if (currentCredits <= 0) {
        throw new Error('NO_CREDITS');
      }
      
      const newCredits = currentCredits - 1;
      
      transaction.update(userRef, {
        examCredits: newCredits,
        lastExamStartedAt: new Date().toISOString()
      });
      
      return { previousCredits: currentCredits, newCredits };
    });
    
    console.log(`✅ Credit consumed for user ${uid}: ${result.previousCredits} -> ${result.newCredits}`);
    
    res.json({
      success: true,
      message: 'Exam credit consumed',
      data: {
        previousCredits: result.previousCredits,
        remainingCredits: result.newCredits
      }
    });
    
  } catch (error) {
    console.error('Consume credit error:', error);
    
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json({ 
        success: false, 
        error: 'User profile not found. Please refresh and try again.' 
      });
    }
    
    if (error.message === 'NO_CREDITS') {
      return res.status(400).json({ 
        success: false, 
        error: 'No exam credits available. Please purchase credits to continue.' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to start exam. Please try again.' 
    });
  }
});

// Get user credits (for checking without modifying)
app.post('/api/get-credits', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  const { idToken } = req.body;
  
  if (!idToken) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  if (!admin || !admin.apps.length) {
    return res.status(500).json({ success: false, error: 'Server not configured' });
  }
  
  let uid;
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    uid = decodedToken.uid;
  } catch (tokenError) {
    console.error('Token verification failed:', tokenError.message);
    return res.status(401).json({ success: false, error: 'Invalid authentication token' });
  }
  
  try {
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return res.json({ success: true, credits: 0 });
    }
    
    const credits = Number(userDoc.data().examCredits) || 0;
    res.json({ success: true, credits });
    
  } catch (error) {
    console.error('Get credits error:', error);
    res.status(500).json({ success: false, error: 'Failed to get credits' });
  }
});

// Download APK from GitHub releases
// Usage: /download/v1.0.0/JambGenius.apk
app.get('/download/:version/:filename', (req, res) => {
  try {
    const { version, filename } = req.params;
    
    // Build GitHub releases download URL
    const githubUrl = `https://github.com/bossgpt8/JambGeniusWebWrapper/releases/download/${version}/${filename}`;
    
    console.log(`📥 Downloading from GitHub: ${githubUrl}`);
    
    // Fetch the file from GitHub releases
    https.get(githubUrl, (githubRes) => {
      // Check if file exists
      if (githubRes.statusCode === 404) {
        console.error(`❌ File not found on GitHub: ${githubUrl}`);
        return res.status(404).json({ error: 'App not found. Please check the release version.' });
      }
      
      if (githubRes.statusCode !== 200) {
        console.error(`❌ GitHub error: ${githubRes.statusCode}`);
        return res.status(500).json({ error: 'Failed to download from GitHub' });
      }
      
      // Set download headers
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Copy headers from GitHub response
      if (githubRes.headers['content-length']) {
        res.setHeader('Content-Length', githubRes.headers['content-length']);
      }
      
      // Pipe the file directly to the user
      githubRes.pipe(res);
      
      githubRes.on('end', () => {
        console.log(`✅ APK download completed: ${filename}`);
      });
      
    }).on('error', (error) => {
      console.error('❌ GitHub download error:', error);
      res.status(500).json({ error: 'Failed to download from GitHub' });
    });
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to process download' });
  }
});

// Fallback: Direct download from server if GitHub not available
app.get('/download/app.apk', (req, res) => {
  try {
    const apkPath = path.join(__dirname, 'downloads', 'app.apk');
    
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="JambGenius.apk"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    res.download(apkPath, 'JambGenius.apk', (err) => {
      if (err) {
        console.log('APK download started successfully');
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download app' });
  }
});

// AI Explanation endpoint - Uses OpenRouter with Meta Llama 3.3
app.post('/api/gemini-explain', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { question, options, correctAnswer, userAnswer } = req.body;

  if (!question || !correctAnswer) {
    return res.status(400).json({ error: 'Question and correctAnswer are required' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY is not configured');
    return res.status(500).json({ success: false, error: 'AI service not configured' });
  }

  try {
    const prompt = `You are a JAMB exam tutor. A student is practicing for the JAMB UTME exam. 

Question: ${question}

Options:
${options ? Object.entries(options).map(([key, value]) => `${key}: ${value}`).join('\n') : 'No options provided'}

Correct Answer: ${correctAnswer}
${userAnswer ? `Student's Answer: ${userAnswer}` : ''}

Please provide a clear, concise explanation in 2-3 sentences:
1. ${userAnswer ? `Explain why "${userAnswer}" is incorrect and` : ''} why "${correctAnswer}" is the correct answer
2. Give a study tip to remember this concept

Keep it educational and encouraging.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Title': 'JambGenius AI'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-8b-instruct:free',
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('OpenRouter API error:', data.error);
      return res.status(500).json({ success: false, error: 'AI service error: ' + (data.error.message || 'Unknown error') });
    }

    const explanation = data?.choices?.[0]?.message?.content;
    
    if (explanation) {
      return res.status(200).json({
        success: true,
        explanation: explanation
      });
    }

    return res.status(200).json({
      success: false,
      error: 'No explanation generated'
    });

  } catch (error) {
    console.error('Error calling OpenRouter API:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// AI Chat endpoint - Uses OpenRouter with Meta Llama 3.3
app.post('/api/chat', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { question, history } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY is not configured');
    return res.status(500).json({ error: 'AI service not configured. Please add your OpenRouter API key.' });
  }

  try {
    // Build conversation history
    const chatHistory = Array.isArray(history) ? history : [];
    
    // System prompt for JambGenius AI tutor
    const systemMessage = {
      role: 'system',
      content: `You are JambGenius AI, a highly knowledgeable and friendly JAMB exam tutor assistant for Nigerian students.

Your role is to help students prepare for the Joint Admissions and Matriculation Board (JAMB) examination.

When answering questions:
- Academic subjects: Explain clearly with examples relevant to JAMB syllabus
- Exam tips: Give practical, actionable advice for JAMB success
- Math problems: Show step-by-step solutions
- Definitions: Give clear, concise explanations
- Use of English: Help with comprehension, grammar, and vocabulary

Be encouraging, supportive, and use markdown formatting for better readability when appropriate.`
    };

    // Build messages array
    const messages = [
      systemMessage,
      ...chatHistory,
      { role: 'user', content: question }
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Title': 'JambGenius AI'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-8b-instruct:free',
        messages: messages
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('OpenRouter API error:', data.error);
      return res.status(500).json({ error: 'AI service error: ' + (data.error.message || 'Unknown error') });
    }

    const answer = data?.choices?.[0]?.message?.content || 'I could not generate a response. Please try again.';

    // Return updated history for the frontend to maintain
    const updatedHistory = [
      ...chatHistory,
      { role: 'user', content: question },
      { role: 'assistant', content: answer }
    ];

    return res.json({ answer, history: updatedHistory });
  } catch (error) {
    console.error('Error calling OpenRouter API:', error);
    return res.status(500).json({ error: 'Failed to get AI response' });
  }
});

// SPA Fallback Route - Serve index.html for all non-API requests
// This allows client-side routing to work properly
app.get('*', (req, res) => {
  // Don't catch API routes or file extensions
  if (req.path.startsWith('/api/') || /\.\w+$/.test(req.path)) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  // Serve index.html for all other routes to enable SPA routing
  res.sendFile(path.join(__dirname, 'index.html'), (err) => {
    if (err) {
      console.error('Error sending index.html:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
