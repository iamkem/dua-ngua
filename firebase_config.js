const firebase = require("firebase/compat/app").default;
require("firebase/compat/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyASmSC_p_bchFLVAM7zjXl5FPox7qSyAZ8",
  authDomain: "electron-dua-ngua.firebaseapp.com",
  projectId: "electron-dua-ngua",
  storageBucket: "electron-dua-ngua.firebasestorage.app",
  messagingSenderId: "89642892978",
  appId: "1:89642892978:web:16be2b62853bb7435753ab",
};

// Initialize only if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

module.exports = { firebase, db };
