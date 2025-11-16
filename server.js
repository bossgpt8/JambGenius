require('dotenv').config();
const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('.'));

app.post('/api/verify-payment', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { reference, email, fullName } = req.body;
  
  console.log('Verifying payment:', { reference, email, fullName });
  
  if (!reference) {
    return res.status(400).json({ error: 'Payment reference is required' });
  }

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
        
        const EXPECTED_AMOUNT = 100000;
        if (result.data.amount !== EXPECTED_AMOUNT) {
          console.error(`Amount mismatch: expected ${EXPECTED_AMOUNT}, got ${result.data.amount}`);
          return res.status(400).json({
            success: false,
            error: `Amount mismatch: expected ₦1,000, got ₦${result.data.amount / 100}`
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
            fullName: fullName
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
