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
  
  const { reference, email, fullName, expectedCredits } = req.body;
  
  console.log('Verifying payment:', { reference, email, fullName, expectedCredits });
  
  if (!reference) {
    return res.status(400).json({ error: 'Payment reference is required' });
  }

  const credits = expectedCredits || 1;
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

  const paystackRequest = https.request(options, (paystackRes) => {
    let data = '';
    
    paystackRes.on('data', (chunk) => {
      data += chunk;
    });
    
    paystackRes.on('end', () => {
      try {
        const result = JSON.parse(data);
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
        
        if (result.data.amount !== expectedAmount) {
          console.error(`Amount mismatch: expected ${expectedAmount}, got ${result.data.amount}`);
          return res.status(400).json({
            success: false,
            error: `Amount mismatch: expected ₦${expectedAmount / 100}, got ₦${result.data.amount / 100}`
          });
        }
        
        res.json({
          success: true,
          message: 'Payment verified successfully',
          data: {
            reference: reference,
            amount: result.data.amount,
            currency: result.data.currency,
            email: result.data.customer?.email || email,
            fullName: fullName,
            credits: credits
          }
        });
      } catch (error) {
        console.error('Error parsing Paystack response:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    });
  });

  paystackRequest.on('error', (error) => {
    console.error('Paystack request error:', error);
    res.status(500).json({ success: false, error: 'Payment verification failed' });
  });

  paystackRequest.end();
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
