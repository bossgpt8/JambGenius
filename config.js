const CONFIG = {
  firebase: {
    apiKey: "AIzaSyCSVbZVsBO8luLUT-HznUQe57FGRZ_2U5g",
    authDomain: "jambgenius.firebaseapp.com",
    projectId: "jambgenius",
    storageBucket: "jambgenius.firebasestorage.app",
    messagingSenderId: "1057264829205",
    appId: "1:1057264829205:web:384c075641553eacd95f1c",
    measurementId: "G-ZTDYRGNW4N"
  },
  
  supabase: {
    url: "YOUR_SUPABASE_URL",
    anonKey: "YOUR_SUPABASE_ANON_KEY"
  },
  
  paystack: {
    publicKey: "pk_live_1ba90ace4fcc8f395ed8f0099674163e0c6dc76b"
  },
  
  recaptcha: {
    siteKey: "6LdRG7QrAAAAAGVmW6QKF9Jb9HcnsXMG3u_5FXKe"
  },
  
  pricing: {
    mockExamPrice: 100000,
    mockExamPriceFormatted: "₦1,000"
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
