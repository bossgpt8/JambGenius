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
    url: "https://nhmrlhapibfowejeiuin.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5obXJsaGFwaWJmb3dlamVpdWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NzIxNzYsImV4cCI6MjA3ODA0ODE3Nn0.ZiNEsV70uknPFwhuX3NNNpo6z6n8dcINnYgb2ZISC6c",
    functions: {
      verifyPayment: "https://nhmrlhapibfowejeiuin.supabase.co/functions/v1/JambGenius",
      verifyRecaptcha: "https://nhmrlhapibfowejeiuin.supabase.co/functions/v1/quick-service"
    }
  },
  
  paystack: {
    publicKey: "pk_test_56ea9fe6dc1cc19b965031a6297e3a683f9804af"
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
