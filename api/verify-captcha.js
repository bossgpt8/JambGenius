const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, error: 'Captcha token is required' });
  }

  const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY;
  
  if (!turnstileSecretKey) {
    console.warn('⚠️ Turnstile secret key not configured - allowing verification for development');
    return res.status(200).json({ success: true });
  }

  const postData = JSON.stringify({
    secret: turnstileSecretKey,
    response: token
  });

  const options = {
    hostname: 'challenges.cloudflare.com',
    port: 443,
    path: '/turnstile/v0/siteverify',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve) => {
    const turnstileRequest = https.request(options, (turnstileRes) => {
      let data = '';

      turnstileRes.on('data', (chunk) => {
        data += chunk;
      });

      turnstileRes.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('Turnstile verification response:', result);

          if (result.success) {
            res.status(200).json({ success: true });
          } else {
            console.error('Turnstile verification failed:', result);
            res.status(400).json({
              success: false,
              error: 'Verification failed',
              errorCodes: result['error-codes']
            });
          }
          resolve();
        } catch (error) {
          console.error('Error parsing Turnstile response:', error);
          res.status(500).json({ success: false, error: 'Internal server error' });
          resolve();
        }
      });
    });

    turnstileRequest.on('error', (error) => {
      console.error('Turnstile request error:', error);
      res.status(500).json({ success: false, error: 'Verification failed' });
      resolve();
    });

    turnstileRequest.write(postData);
    turnstileRequest.end();
  });
};
