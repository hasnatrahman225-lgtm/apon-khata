import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from '../frontend/node_modules/firebase/app/dist/index.mjs';
import { getFirestore, doc, setDoc } from '../frontend/node_modules/firebase/firestore/dist/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
const db = getFirestore(app);

const sqliteDb = new DatabaseSync(path.join(__dirname, '..', 'backend', 'data', 'khatabook.sqlite'));

const oldUserId = '8c378ee5-795c-4747-9f95-4e5ec0f75f39';
const firebaseUid = 'Vaoci7ocJaaND9KgNifcjDsXIpi2'; // hasnat.rahman225@gmail.com

async function run() {
  console.log('Migrating profile...');
  const user = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(oldUserId);
  await setDoc(doc(db, 'users', firebaseUid), {
    id: firebaseUid,
    email: user.email,
    name: user.name || 'Md Motiur Rahman',
    business_name: user.business_name || '',
    business_phone: user.business_phone || '',
    created_at: user.created_at || new Date().toISOString()
  });
  console.log('Profile saved.');

  console.log('Migrating contacts...');
  const contacts = sqliteDb.prepare('SELECT * FROM contacts WHERE user_id = ?').all(oldUserId);
  for (const c of contacts) {
    await setDoc(doc(db, 'users', firebaseUid, 'contacts', c.id), {
      id: c.id,
      user_id: firebaseUid,
      type: c.type,
      name: c.name,
      phone: c.phone || '',
      note: c.note || '',
      created_at: c.created_at
    });
    console.log(`Migrated contact: ${c.name} (${c.id})`);
  }

  console.log('Migrating transactions...');
  const txs = sqliteDb.prepare('SELECT * FROM transactions WHERE user_id = ?').all(oldUserId);
  for (const t of txs) {
    await setDoc(doc(db, 'users', firebaseUid, 'transactions', t.id), {
      id: t.id,
      user_id: firebaseUid,
      contact_id: t.contact_id,
      direction: t.direction,
      amount: Number(t.amount),
      category: t.category || 'general',
      note: t.note || '',
      occurred_at: t.occurred_at,
      created_at: t.created_at
    });
  }
  console.log(`Successfully migrated ${txs.length} transactions!`);
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
