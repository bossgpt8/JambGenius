const CONFIG = {
  firebase: {
    apiKey: "AIzaSyCSVbZVsBO8luLUT-HznUQe57FGRZ_2U5g",
    authDomain: "jambgenius.fireb aseapp.com",
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
    siteKey: "0x4AAAAAACB3zrPWsUiuRJU7",
  },

  pricing: {
    mockExamPrice: 100000,
    mockExamPriceFormatted: "₦1,000",
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = CONFIG;
}
