const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const { initializeApp } = require('../frontend/node_modules/firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('../frontend/node_modules/firebase/auth');
const { getFirestore, doc, setDoc, collection } = require('../frontend/node_modules/firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCxSYnr_eyrX65_WvFz4xPK8A8GU0hCQW8",
  authDomain: "apan-khata.firebaseapp.com",
  projectId: "apan-khata",
  storageBucket: "apan-khata.firebasestorage.app",
  messagingSenderId: "839523441880",
  appId: "1:839523441880:web:c023e9060ede63da7c4bad",
  measurementId: "G-JLMK6J2GMM"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const sqliteDb = new DatabaseSync(path.join(__dirname, '..', 'backend', 'data', 'khatabook.sqlite'));

async function migrate() {
  const email = "hasnat.rahman225@gmail.com";
  const password = "password"; // wait, what was the password? The user typed "036928" in the mobile app!
  const userPassword = "password_036928";
}
