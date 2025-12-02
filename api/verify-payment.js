const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  return new Promise((resolve) => {
    const paystackRequest = https.request(options, (paystackRes) => {
      let data = '';

      paystackRes.on('data', (chunk) => {
        data += chunk;
      });

      paystackRes.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('=== FULL PAYSTACK RESPONSE ===');
          console.log('Status:', result.status);
          console.log('Message:', result.message);
          console.log('Data:', JSON.stringify(result.data, null, 2));
          console.log('==============================');

          if (!result.status) {
            console.error('Paystack request failed:', result.message);
            return res.status(400).json({
              success: false,
              error: result.message || 'Verification failed'
            });
          }

          if (result.data.status !== 'success') {
            return res.status(400).json({
              success: false,
              error: `Payment not successful: ${result.data.status}`
            });
          }

          // Verify amount is correct (allow small variance for rounding or currency conversion)
          const amountDifference = Math.abs(result.data.amount - expectedAmount);
          const percentDifference = (amountDifference / expectedAmount) * 100;
          
          // Allow up to 5% variance or ₦500 (whichever is LARGER) for payment processing fees
          // This ensures large payments (like ₦99,000) accept proportional variance
          const allowedVariance = Math.max(expectedAmount * 0.05, 50000); // 5% or ₦500, whichever is larger
          
          if (amountDifference > allowedVariance) {
            console.error('Amount mismatch:', {
              expected: expectedAmount,
              received: result.data.amount,
              difference: amountDifference,
              percentDifference: percentDifference,
              credits: credits
            });
            return res.status(400).json({
              success: false,
              error: `Amount variance too high. Expected ₦${(expectedAmount / 100).toFixed(2)}, got ₦${(result.data.amount / 100).toFixed(2)}. This may be due to payment processing fees. Contact support with reference: ${result.data.reference}`
            });
          }

          return res.status(200).json({
            success: true,
            message: 'Payment verified successfully',
            data: {
              reference: result.data.reference,
              amount: result.data.amount,
              currency: result.data.currency || 'NGN',
              email: result.data.customer.email,
              paidAt: result.data.paid_at,
              status: result.data.status,
              credits: credits
            }
          });
        } catch (error) {
          console.error('Error parsing Paystack response:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to process payment verification'
          });
        }
      });
    });

    paystackRequest.on('error', (error) => {
      console.error('Paystack request error:', error);
      return res.status(500).json({
        success: false,
        error: 'Payment verification failed'
      });
    });

    paystackRequest.end();
  });
};
