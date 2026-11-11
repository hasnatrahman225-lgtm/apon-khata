import { initializeApp } from '../frontend/node_modules/firebase/app/dist/index.mjs';
import { getAuth, signInWithEmailAndPassword } from '../frontend/node_modules/firebase/auth/dist/index.mjs';
import { getFirestore, doc, setDoc } from '../frontend/node_modules/firebase/firestore/dist/index.mjs';

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

const uid = 'Vaoci7ocJaaND9KgNifcjDsXIpi2'; // hasnat.rahman225@gmail.com
const contactId = '7810e475-e271-4a6e-a4af-20bd10cfb23f'; // Feroz Sir

const missingTxs = [
  {
    id: 'tx_railway_1727503080000',
    user_id: uid,
    contact_id: contactId,
    direction: 'gave',
    amount: 650,
    category: 'general',
    note: 'Tea 500 gm',
    occurred_at: '2026-09-28 09:58:00',
    created_at: '2026-09-28 09:58:00'
  },
  {
    id: 'tx_railway_1727531040000',
    user_id: uid,
    contact_id: contactId,
    direction: 'gave',
    amount: 2000,
    category: 'general',
    note: 'Bill 901',
    occurred_at: '2026-09-28 17:44:00',
    created_at: '2026-09-28 17:44:00'
  },
  {
    id: 'tx_railway_1727532000000',
    user_id: uid,
    contact_id: contactId,
    direction: 'gave',
    amount: 1000,
    category: 'general',
    note: 'Bill 911',
    occurred_at: '2026-09-28 18:00:00',
    created_at: '2026-09-28 18:00:00'
  },
  {
    id: 'tx_railway_1727672520000',
    user_id: uid,
    contact_id: contactId,
    direction: 'gave',
    amount: 9158,
    category: 'general',
    note: 'HOLDING TAX',
    occurred_at: '2026-09-30 09:02:00',
    created_at: '2026-09-30 09:02:00'
  },
  {
    id: 'tx_railway_1727672700000',
    user_id: uid,
    contact_id: contactId,
    direction: 'gave',
    amount: 1568,
    category: 'general',
    note: 'HOLDING TAX',
    occurred_at: '2026-09-30 09:05:00',
    created_at: '2026-09-30 09:05:00'
  },
  {
    id: 'tx_railway_1727672820000',
    user_id: uid,
    contact_id: contactId,
    direction: 'gave',
    amount: 4250,
    category: 'general',
    note: 'FOR FAIZA BIRTHDAY CACK',
    occurred_at: '2026-09-30 09:07:00',
    created_at: '2026-09-30 09:07:00'
  }
];

async function addMissing() {
  console.log('Signing in to Firebase Auth...');
  await signInWithEmailAndPassword(auth, 'hasnat.rahman225@gmail.com', '036928');
  console.log('Authenticated successfully as hasnat.rahman225@gmail.com');

  console.log(`Adding ${missingTxs.length} missing transactions into Firestore...`);
  for (const tx of missingTxs) {
    await setDoc(doc(db, 'users', uid, 'transactions', tx.id), tx);
    console.log(`Added: ${tx.note} - ৳${tx.amount} (${tx.occurred_at})`);
  }
  console.log('All missing transactions successfully added to Cloud Firestore!');
  process.exit(0);
}

addMissing().catch(e => {
  console.error(e);
  process.exit(1);
});
