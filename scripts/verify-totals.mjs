import { initializeApp } from '../frontend/node_modules/firebase/app/dist/index.mjs';
import { getAuth, signInWithEmailAndPassword } from '../frontend/node_modules/firebase/auth/dist/index.mjs';
import { getFirestore, collection, getDocs } from '../frontend/node_modules/firebase/firestore/dist/index.mjs';

const firebaseConfig = {
  apiKey: "AIzaSyCxsYnr_eyrX65_WvFz4xPK8A8GU0hCQW8",
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

async function check() {
  await signInWithEmailAndPassword(auth, 'hasnat.rahman225@gmail.com', '036928');
  const snap = await getDocs(collection(db, 'users', 'Vaoci7ocJaaND9KgNifcjDsXIpi2', 'transactions'));
  let gave = 0, got = 0;
  snap.forEach(d => {
    const t = d.data();
    if (t.direction === 'gave') gave += Number(t.amount);
    if (t.direction === 'got') got += Number(t.amount);
  });
  console.log({ totalTxs: snap.size, gave, got, net: gave - got });
  process.exit(0);
}
check();
