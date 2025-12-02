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

  const hcaptchaSecretKey = process.env.HCAPTCHA_SECRET_KEY || '0x0000000000000000000000000000000000000000';
  
  // Development mode: skip verification if secret key is not set
  if (!process.env.HCAPTCHA_SECRET_KEY) {
    console.warn('⚠️ hCaptcha secret key not configured - allowing all requests for development');
    return res.json({ success: true });
  }
  
  const postData = new URLSearchParams({
    secret: hcaptchaSecretKey,
    response: token
  }).toString();
  
  const options = {
    hostname: 'hcaptcha.com',
    port: 443,
    path: '/siteverify',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const hcaptchaRequest = https.request(options, (hcaptchaRes) => {
    let data = '';
    
    hcaptchaRes.on('data', (chunk) => {
      data += chunk;
    });
    
    hcaptchaRes.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('hCaptcha verification response:', result);
        
        if (result.success) {
          return res.json({ success: true });
        } else {
          console.error('hCaptcha verification failed:', result);
          return res.status(400).json({ 
            success: false, 
            error: 'Verification failed',
            errorCodes: result['error-codes']
          });
        }
      } catch (error) {
        console.error('Error parsing hCaptcha response:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    });
  });

  hcaptchaRequest.on('error', (error) => {
    console.error('hCaptcha request error:', error);
    res.status(500).json({ success: false, error: 'Verification failed' });
  });

  hcaptchaRequest.write(postData);
  hcaptchaRequest.end();
});

app.post('/api/verify-payment', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  const { reference, email, fullName, expectedCredits, uid } = req.body;
  
  console.log('Verifying payment:', { reference, email, fullName, expectedCredits, uid });
  
  if (!reference) {
    return res.status(400).json({ error: 'Payment reference is required' });
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
