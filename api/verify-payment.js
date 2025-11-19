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

  return new Promise((resolve) => {
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

          const EXPECTED_AMOUNT = 100000;
          if (result.data.amount !== EXPECTED_AMOUNT) {
            return res.status(400).json({
              success: false,
              error: `Amount mismatch. Expected ₦1,000, got ₦${result.data.amount / 100}`
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
              status: result.data.status
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
