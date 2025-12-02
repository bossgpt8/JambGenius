const https = require('https');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin once
if (!global.firebaseAdminInitialized) {
    initializeApp({
        credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
    global.firebaseAdminInitialized = true;
}
const db = getFirestore();

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { reference, email, fullName, expectedCredits, uid } = req.body;

    console.log('Verifying payment:', { reference, email, fullName, expectedCredits, uid });

    if (!reference) return res.status(400).json({ error: 'Payment reference is required' });
    if (!uid) return res.status(400).json({ error: 'User ID (uid) is required' });

    const credits = Number(expectedCredits) || 1;
    const PRICE_PER_CREDIT = 1000 * 100; // ₦1,000 in kobo
    const expectedAmount = credits * PRICE_PER_CREDIT;

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
        return res.status(500).json({
            success: false,
            error: 'Payment system is not properly configured.'
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

    const verifyPaystack = () => new Promise((resolve, reject) => {
        const reqPaystack = https.request(options, (paystackRes) => {
            let data = '';
            paystackRes.on('data', (chunk) => data += chunk);
            paystackRes.on('end', () => resolve(JSON.parse(data)));
        });
        reqPaystack.on('error', reject);
        reqPaystack.end();
    });

    try {
        const result = await verifyPaystack();
        console.log('Paystack response:', JSON.stringify(result, null, 2));

        if (!result.status || result.data.status !== 'success') {
            return res.status(400).json({
                success: false,
                error: result.message || `Payment not successful: ${result.data.status}`
            });
        }

        const amountDifference = Math.abs(result.data.amount - expectedAmount);
        if (amountDifference > 100) {
            return res.status(400).json({
                success: false,
                error: `Amount mismatch. Expected ₦${(expectedAmount / 100).toLocaleString()}, got ₦${(result.data.amount / 100).toLocaleString()}.`
            });
        }

        // Firestore update
        const userDocRef = db.collection('users').doc(uid);
        const userDoc = await userDocRef.get();
        const currentCredits = userDoc.exists ? (userDoc.data().examCredits || 0) : 0;

        try {
            await userDocRef.set({
                examCredits: currentCredits + credits,
                lastPaymentReference: reference,
                lastPaymentAt: new Date().toISOString(),
                lastPaymentAmount: result.data.amount,
                lastPaymentCurrency: result.data.currency,
                email,
                fullName,
                paymentHistory: userDoc.exists && userDoc.data().paymentHistory
                    ? [...userDoc.data().paymentHistory, {
                        reference,
                        amount: result.data.amount,
                        currency: result.data.currency,
                        credits,
                        paidAt: new Date().toISOString()
                    }]
                    : [{
                        reference,
                        amount: result.data.amount,
                        currency: result.data.currency,
                        credits,
                        paidAt: new Date().toISOString()
                    }]
            }, { merge: true });
        } catch (firestoreError) {
            console.error('Firestore write error:', firestoreError);
            return res.status(500).json({
                success: false,
                error: `Firestore error: ${firestoreError.code} - ${firestoreError.message}`
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Payment verified and credits updated successfully',
            data: {
                reference: result.data.reference,
                amount: result.data.amount,
                currency: result.data.currency || 'NGN',
                credits,
                paidAt: result.data.paid_at
            }
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
};
