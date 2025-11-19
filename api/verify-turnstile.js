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

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'Turnstile token is required'
    });
  }

  const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!turnstileSecretKey) {
    console.error('TURNSTILE_SECRET_KEY is not configured!');
    return res.status(500).json({
      success: false,
      error: 'Verification system is not properly configured.'
    });
  }

  try {
    const verifyResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: turnstileSecretKey,
          response: token
        })
      }
    );

    const outcome = await verifyResponse.json();
    console.log('Turnstile verification response:', outcome);

    if (outcome.success) {
      return res.json({ success: true });
    } else {
      console.error('Turnstile verification failed:', outcome);
      return res.status(400).json({
        success: false,
        error: 'Verification failed. Please try again.',
        errorCodes: outcome['error-codes']
      });
    }
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Verification system error'
    });
  }
};
