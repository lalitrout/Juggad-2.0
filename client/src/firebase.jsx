// firebase.jsx
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // ✅ ADD THIS

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.useDeviceLanguage();

const db = getFirestore(app); // ✅ Create Firestore instance

const googleProvider = new GoogleAuthProvider();

const setUpRecaptcha = (phoneNumber, containerId = "recaptcha-container") => {
  return new Promise((resolve, reject) => {
    const recaptchaVerifier = new RecaptchaVerifier(
      containerId,
      {
        size: "invisible",
        callback: () => {
          console.log("reCAPTCHA verified!");
        },
        "expired-callback": () => {
          reject(new Error("reCAPTCHA expired. Please try again."));
        }
      },
      auth
    );

    signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier)
      .then((confirmationResult) => {
        resolve(confirmationResult);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

export { auth, db, googleProvider, setUpRecaptcha }; // ✅ Now db is exported
