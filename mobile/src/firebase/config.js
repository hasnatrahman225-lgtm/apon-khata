import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const firebaseConfig = {
  apiKey: "AIzaSyCxsYnr_eyrX65_WvFz4xPK8A8GU0hCQW8",
  authDomain: "apan-khata.firebaseapp.com",
  projectId: "apan-khata",
  storageBucket: "apan-khata.firebasestorage.app",
  messagingSenderId: "839523441880",
  appId: "1:839523441880:web:c023e9060ede63da7c4bad",
  measurementId: "G-JLMK6J2GMM"
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (e) {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);
