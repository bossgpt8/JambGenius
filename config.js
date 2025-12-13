// Default config with public keys
let CONFIG = {
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
    publicKey: "pk_test_56ea9fe6dc1cc19b965031a6297e3a683f9804af",
  },
  turnstile: {
    siteKey: "0x4AAAAAACGI8VseTrezhqX1",
  },
  pricing: {
    mockExamPrice: 100000,
    mockExamPriceFormatted: "₦1,000",
  },
};

// Load live config from API (environment-specific values)
async function loadLiveConfig() {
  try {
    const response = await fetch('/api/config');
    const liveConfig = await response.json();
    CONFIG = { ...CONFIG, ...liveConfig };
    window.CONFIG = CONFIG;
    window.appConfig = CONFIG;
  } catch (error) {
    // Fallback to defaults if API fails
    window.CONFIG = CONFIG;
    window.appConfig = CONFIG;
  }
}

// Initialize config
if (typeof window !== "undefined") {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadLiveConfig);
  } else {
    loadLiveConfig();
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = CONFIG;
}
