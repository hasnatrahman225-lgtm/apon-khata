import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyCxsYnr_eyrX65_WvFz4xPK8A8GU0hCQW8",
  authDomain: "apan-khata.firebaseapp.com",
  projectId: "apan-khata",
  storageBucket: "apan-khata.firebasestorage.app",
  messagingSenderId: "839523441880",
  appId: "1:839523441880:web:c023e9060ede63da7c4bad",
  measurementId: "G-JLMK6J2GMM"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
