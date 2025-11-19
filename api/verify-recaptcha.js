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

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      error: 'reCAPTCHA token is required'
    });
  }

  const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!recaptchaSecretKey) {
    console.error('RECAPTCHA_SECRET_KEY is not configured!');
    return res.status(500).json({
      success: false,
      error: 'reCAPTCHA system is not properly configured. Please contact support.'
    });
  }

  const postData = `secret=${encodeURIComponent(recaptchaSecretKey)}&response=${encodeURIComponent(token)}`;

  const options = {
    hostname: 'www.google.com',
    port: 443,
    path: '/recaptcha/api/siteverify',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve) => {
    const recaptchaRequest = https.request(options, (recaptchaRes) => {
      let data = '';

      recaptchaRes.on('data', (chunk) => {
        data += chunk;
      });

      recaptchaRes.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('reCAPTCHA verification response:', result);

          if (result.success) {
            return res.json({ success: true });
          } else {
            console.error('reCAPTCHA verification failed:', result);
            return res.status(400).json({
              success: false,
              error: 'reCAPTCHA verification failed',
              errorCodes: result['error-codes']
            });
          }
        } catch (error) {
          console.error('Error parsing reCAPTCHA response:', error);
          return res.status(500).json({
            success: false,
            error: 'Internal server error'
          });
        }
      });
    });

    recaptchaRequest.on('error', (error) => {
      console.error('reCAPTCHA request error:', error);
      return res.status(500).json({
        success: false,
        error: 'reCAPTCHA verification failed'
      });
    });

    recaptchaRequest.write(postData);
    recaptchaRequest.end();
  });
};
