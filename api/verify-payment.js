import https from 'https';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { reference, email, fullName } = req.body;

  if (!reference) {
    return res.status(400).json({ error: 'Payment reference is required' });
  }

  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecretKey) {
    return res.status(500).json({
      success: false,
      error: 'Server not configured (missing Paystack secret key)'
    });
  }

  const options = {
    hostname: 'api.paystack.co',
    port: 443,
    path: `/transaction/verify/${reference}`,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${paystackSecretKey}`,
      'Content-Type': 'application/json'
    }
  };

  const paystackResponse = await new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      let data = '';

      response.on('data', (chunk) => (data += chunk));
      response.on('end', () => resolve(data));
    });

    request.on('error', (err) => reject(err));
    request.end();
  });

  try {
    const result = JSON.parse(paystackResponse);

    if (!result.status || !result.data) {
      return res.status(400).json({
        success: false,
        error: result.message || 'Invalid Paystack response'
      });
    }

    if (result.data.status !== 'success') {
      return res.status(400).json({
        success: false,
        error: `Payment not successful: ${result.data.status}`
      });
    }

    const EXPECTED_AMOUNT = 100000; // 1000 Naira
    if (result.data.amount !== EXPECTED_AMOUNT) {
      return res.status(400).json({
        success: false,
        error: `Amount mismatch. Expected ₦1000, got ₦${result.data.amount / 100}`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        reference,
        amount: result.data.amount,
        email: result.data.customer?.email || email,
        fullName
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Server error parsing Paystack response'
    });
  }
}
