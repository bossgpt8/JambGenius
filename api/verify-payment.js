import https from 'https';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase-init.js'; // adjust path if needed

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { reference, email, fullName, userId, currency } = req.body;

  if (!reference) return res.status(400).json({ error: 'Payment reference is required' });
  if (!userId) return res.status(400).json({ error: 'User ID is required' });

  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecretKey) return res.status(500).json({ error: 'Server not configured (missing Paystack secret key)' });

  // Helper to verify Paystack transaction
  const verifyPayment = (ref) => {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.paystack.co',
        port: 443,
        path: `/transaction/verify/${ref}`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json'
        }
      };

      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => (data += chunk));
        response.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new Error('Invalid Paystack response'));
          }
        });
      });

      request.on('error', reject);
      request.end();
    });
  };

  try {
    const result = await verifyPayment(reference);

    if (!result.status || !result.data) {
      return res.status(400).json({ error: result.message || 'Invalid Paystack response' });
    }

    if (result.data.status !== 'success') {
      return res.status(400).json({ error: `Payment not successful: ${result.data.status}` });
    }

    const EXPECTED_AMOUNT = 100000; // 1000 Naira
    if (result.data.amount !== EXPECTED_AMOUNT) {
      return res.status(400).json({ error: `Amount mismatch. Expected ₦1000, got ₦${result.data.amount / 100}` });
    }

    // Update Firestore safely
    await setDoc(doc(db, 'users', userId), {
      lastPaymentAmount: result.data.amount,
      lastPaymentCurrency: currency || 'NGN', // default if undefined
      lastPaymentReference: reference,
      email: result.data.customer?.email || email || null,
      fullName: fullName || null,
      lastPaymentDate: new Date()
    }, { merge: true });

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        reference,
        amount: result.data.amount,
        email: result.data.customer?.email || email || null,
        fullName: fullName || null
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Server error verifying payment' });
  }
}
