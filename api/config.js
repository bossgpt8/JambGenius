// Serve frontend config with environment variables
module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const config = {
    firebase: {
      apiKey: "AIzaSyCSVbZVsBO8luLUT-HznUQe57FGRZ_2U5g",
      authDomain: "jambgenius.firebaseapp.com",
      projectId: "jambgenius",
      storageBucket: "jambgenius.firebasestorage.app",
      messagingSenderId: "1057264829205",
      appId: "1:1057264829205:web:384c075641553eacd95f1c",
      measurementId: "G-ZTDYRGNW4N",
    },
    paystack: {
      publicKey: process.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_56ea9fe6dc1cc19b965031a6297e3a683f9804af",
    },
    hcaptcha: {
      siteKey: process.env.HCAPTCHA_SITEKEY || "10000000-ffff-ffff-ffff-000000000001",
    },
    pricing: {
      mockExamPrice: 100000,
      mockExamPriceFormatted: "₦1,000",
    },
  };

  return res.status(200).json(config);
};
