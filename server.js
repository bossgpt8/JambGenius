require('dotenv').config();
const express = require('express');
const https = require('https');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname)));

// ───────────────────────────────────────────
// FIREBASE ADMIN INITIALIZATION
// ───────────────────────────────────────────
let admin;
try {
  admin = require('firebase-admin');

  if (!admin.apps.length) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    };

    if (serviceAccount.projectId && serviceAccount.privateKey && serviceAccount.clientEmail) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("✅ Firebase Admin initialized");
    } else {
      console.log("⚠️ Firebase Admin credentials incomplete");
    }
  }
} catch (err) {
  console.log("⚠️ Firebase Admin not available");
  admin = null;
}

// ───────────────────────────────────────────
// hCAPTCHA VERIFICATION
// ───────────────────────────────────────────
app.post('/api/verify-captcha', async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, error: "Captcha token required" });

  const secret = process.env.HCAPTCHA_SECRET_KEY;

  // Development fallback
  if (!secret) {
    return res.json({ success: true });
  }

  const postData = new URLSearchParams({
    secret: secret,
    response: token
  }).toString();

  const options = {
    hostname: "hcaptcha.com",
    port: 443,
    path: "/siteverify",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(postData)
    }
  };

  const request = https.request(options, (captchaRes) => {
    let data = "";

    captchaRes.on("data", chunk => data += chunk);

    captchaRes.on("end", () => {
      try {
        const result = JSON.parse(data);

        if (result.success) return res.json({ success: true });

        return res.status(400).json({
          success: false,
          error: "Captcha failed",
          errorCodes: result["error-codes"]
        });
      } catch (err) {
        return res.status(500).json({ success: false, error: "Internal server error" });
      }
    });
  });

  request.on("error", () => {
    res.status(500).json({ success: false, error: "Verification failed" });
  });

  request.write(postData);
  request.end();
});

// ───────────────────────────────────────────
// PAYSTACK PAYMENT VERIFICATION + FIREBASE UPDATE
// ───────────────────────────────────────────
app.post('/api/verify-payment', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { reference, email, fullName, expectedCredits, uid } = req.body;
  
  if (!reference || !uid) {
    return res.status(400).json({ error: 'Missing reference or uid' });
  }

  const credits = expectedCredits || 1;
  const PRICE_PER_CREDIT = 100000;
  const expectedAmount = credits * PRICE_PER_CREDIT;

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return res.status(500).json({ error: "Paystack not configured" });
  }

  const options = {
    hostname: "api.paystack.co",
    port: 443,
    path: `/transaction/verify/${reference}`,
    method: "GET",
    headers: {
      "Authorization": `Bearer ${secret}`,
      "Content-Type": "application/json"
    }
  };

  const verifyRequest = https.request(options, (paystackRes) => {
    let data = "";

    paystackRes.on("data", chunk => data += chunk);

    paystackRes.on("end", async () => {
      try {
        const result = JSON.parse(data);

        if (!result.status || result.data.status !== "success") {
          return res.status(400).json({
            success: false,
            error: result.message || "Payment unsuccessful"
          });
        }

        if (result.data.amount !== expectedAmount) {
          return res.status(400).json({
            success: false,
            error: `Amount mismatch. Expected ₦${expectedAmount/100}, got ₦${result.data.amount/100}`
          });
        }

        // 🔥 FIRESTORE CREDIT UPDATE
        const db = admin.firestore();
        const userRef = db.collection("users").doc(uid);

        await db.runTransaction(async (tx) => {
          const doc = await tx.get(userRef);
          let currentCredits = doc.exists ? (doc.data().examCredits || 0) : 0;

          const newCredits = currentCredits + credits;

          tx.set(userRef, {
            examCredits: newCredits,
            lastPaymentReference: reference,
            lastPaymentDate: admin.firestore.Timestamp.now(),
            paymentHistory: admin.firestore.FieldValue.arrayUnion({
              reference,
              amount: expectedAmount / 100,
              creditsAdded: credits,
              date: admin.firestore.Timestamp.now(),
              email,
              fullName
            })
          }, { merge: true });
        });

        return res.json({
          success: true,
          message: "Payment verified & credits added",
          creditsAdded: credits
        });

      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
      }
    });
  });

  verifyRequest.on("error", () => {
    res.status(500).json({ error: "Network error while verifying payment" });
  });

  verifyRequest.end();
});

// ───────────────────────────────────────────
// APK DOWNLOAD FROM GITHUB
// ───────────────────────────────────────────
app.get("/download/:version/:filename", (req, res) => {
  const { version, filename } = req.params;
  const url = `https://github.com/bossgpt8/JambGeniusWebWrapper/releases/download/${version}/${filename}`;

  https.get(url, (ghRes) => {
    if (ghRes.statusCode === 404) {
      return res.status(404).json({ error: "APK not found" });
    }

    if (ghRes.statusCode !== 200) {
      return res.status(500).json({ error: "GitHub download error" });
    }

    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    ghRes.pipe(res);
  }).on("error", () => {
    res.status(500).json({ error: "GitHub network error" });
  });
});

// ───────────────────────────────────────────
// SPA FALLBACK
// ───────────────────────────────────────────
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/") || /\.\w+$/.test(req.path)) {
    return res.status(404).json({ error: "Not found" });
  }

  res.sendFile(path.join(__dirname, "index.html"));
});

// ───────────────────────────────────────────
// START SERVER
// ───────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server live on port ${PORT}`);
});
