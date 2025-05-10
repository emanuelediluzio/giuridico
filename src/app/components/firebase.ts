import { initializeApp, getApps } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDKmPWGxPeMy73iFAz3FDzIRTvSGDzKoJw",
  authDomain: "lexadraft.firebaseapp.com",
  projectId: "lexadraft",
  storageBucket: "lexadraft.appspot.com",
  messagingSenderId: "653961241391",
  appId: "1:653961241391:web:345fe55769b5737d6c37da"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider(); 