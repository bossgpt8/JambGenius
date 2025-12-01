const https = require('https');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { reference, email, fullName, expectedCredits } = req.body;

  console.log('Verifying payment:', { reference, email, fullName, expectedCredits });

  if (!reference) return res.status(400).json({ error: 'Payment reference is required' });

  // Price per credit in kobo
  const PRICE_PER_CREDIT = 1000 * 100; // ₦1,000 in kobo
  const credits = Number(expectedCredits) || 1;
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

      paystackRes.on('data', (chunk) => { data += chunk; });

      paystackRes.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('Paystack response:', JSON.stringify(result, null, 2));

          if (!result.status) {
            return res.status(400).json({ success: false, error: result.message || 'Verification failed' });
          }

          if (result.data.status !== 'success') {
            return res.status(400).json({ success: false, error: `Payment not successful: ${result.data.status}` });
          }

          // Compare amounts in kobo
          const amountDifference = Math.abs(result.data.amount - expectedAmount);
          if (amountDifference > 100) { // allow 100 kobo variance
            console.error('Amount mismatch:', {
              expected: expectedAmount,
              received: result.data.amount,
              difference: amountDifference,
              credits: credits
            });
            return res.status(400).json({
              success: false,
              error: `Amount mismatch. Expected ₦${(expectedAmount / 100).toLocaleString()}, got ₦${(result.data.amount / 100).toLocaleString()}. Reference: ${result.data.reference}`
            });
          }

          // Payment verified successfully
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
          return res.status(500).json({ success: false, error: 'Failed to process payment verification' });
        }
      });
    });

    paystackRequest.on('error', (error) => {
      console.error('Paystack request error:', error);
      return res.status(500).json({ success: false, error: 'Payment verification failed' });
    });

    paystackRequest.end();
  });
};
