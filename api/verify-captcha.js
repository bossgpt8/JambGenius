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

  const hcaptchaSecretKey = process.env.HCAPTCHA_SECRET_KEY;
  
  // Development/testing mode: allow requests if secret key is not set
  if (!hcaptchaSecretKey) {
    console.warn('⚠️ hCaptcha secret key not configured - allowing verification for development');
    return res.status(200).json({ success: true });
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

  return new Promise((resolve) => {
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
            res.status(200).json({ success: true });
          } else {
            console.error('hCaptcha verification failed:', result);
            res.status(400).json({
              success: false,
              error: 'Verification failed',
              errorCodes: result['error-codes']
            });
          }
          resolve();
        } catch (error) {
          console.error('Error parsing hCaptcha response:', error);
          res.status(500).json({ success: false, error: 'Internal server error' });
          resolve();
        }
      });
    });

    hcaptchaRequest.on('error', (error) => {
      console.error('hCaptcha request error:', error);
      res.status(500).json({ success: false, error: 'Verification failed' });
      resolve();
    });

    hcaptchaRequest.write(postData);
    hcaptchaRequest.end();
  });
};
