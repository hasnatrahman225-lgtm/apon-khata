import { auth, db } from '../firebase/config';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';

// Memory fallback in case AsyncStorage native module is not ready or throws
const memoryStore = new Map();

let AsyncStorageModule = null;
try {
  AsyncStorageModule = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  console.warn('AsyncStorage require error:', e);
}

export const storage = {
  async getItem(key) {
    try {
      if (AsyncStorageModule && typeof AsyncStorageModule.getItem === 'function') {
        const val = await AsyncStorageModule.getItem(key);
        if (val !== null && val !== undefined) return val;
      }
    } catch (e) {
      // fallback
    }
    return memoryStore.get(key) || null;
  },
  async setItem(key, val) {
    memoryStore.set(key, String(val));
    try {
      if (AsyncStorageModule && typeof AsyncStorageModule.setItem === 'function') {
        await AsyncStorageModule.setItem(key, String(val));
      }
    } catch (e) {
      // ignore
    }
  },
  async removeItem(key) {
    memoryStore.delete(key);
    try {
      if (AsyncStorageModule && typeof AsyncStorageModule.removeItem === 'function') {
        await AsyncStorageModule.removeItem(key);
      }
    } catch (e) {
      // ignore
    }
  }
};

export const DEFAULT_API_URL = 'Google Firebase Cloud';
const API_STORAGE_KEY = '@khata_api_base_url';
const TOKEN_STORAGE_KEY = '@khata_auth_token';
const USER_STORAGE_KEY = '@khata_auth_user';

export async function getBaseUrl() {
  return 'Google Firebase Cloud';
}

export async function setBaseUrl(url) {
  await storage.setItem(API_STORAGE_KEY, url || 'Google Firebase Cloud');
}

export async function getAuthToken() {
  if (auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken();
    } catch (e) {}
  }
  return await storage.getItem(TOKEN_STORAGE_KEY);
}

export async function setAuthSession(token, user) {
  if (token) await storage.setItem(TOKEN_STORAGE_KEY, token);
  if (user) await storage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export async function getAuthUser() {
  if (auth.currentUser) {
    const u = auth.currentUser;
    const cached = await storage.getItem(USER_STORAGE_KEY);
    const parsed = cached ? JSON.parse(cached) : {};
    return {
      id: u.uid,
      uid: u.uid,
      email: u.email,
      name: u.displayName || parsed.name || u.email.split('@')[0],
      ...parsed,
    };
  }
  const raw = await storage.getItem(USER_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearAuthSession() {
  try {
    await signOut(auth);
  } catch (e) {}
  await storage.removeItem(TOKEN_STORAGE_KEY);
  await storage.removeItem(USER_STORAGE_KEY);
}

async function getCurrentUserId() {
  if (auth.currentUser && auth.currentUser.uid) {
    return auth.currentUser.uid;
  }
  const user = await getAuthUser();
  if (user && (user.uid || user.id)) {
    return user.uid || user.id;
  }
  return null;
}

/**
 * Universal Firebase Client Router
 * Emulates the previous backend REST endpoints directly against Google Cloud Firestore & Auth.
 */
export async function apiRequest(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const urlParts = endpoint.split('?');
  const pathname = urlParts[0];
  const queryStr = urlParts[1] || '';
  const searchParams = new URLSearchParams(queryStr);
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/');

  // 1. Auth routes
  if (segments[0] === 'auth') {
    const action = segments[1];
    const body = options.body ? JSON.parse(options.body) : {};

    if (action === 'login') {
      try {
        const cred = await signInWithEmailAndPassword(auth, body.email.trim(), body.password);
        const token = await cred.user.getIdToken();
        const userRef = doc(db, 'users', cred.user.uid);
        const userSnap = await getDoc(userRef);
        let userData = {
          id: cred.user.uid,
          uid: cred.user.uid,
          email: cred.user.email,
          name: cred.user.displayName || body.email.split('@')[0],
        };
        if (userSnap.exists()) {
          userData = { ...userData, ...userSnap.data() };
        } else {
          await setDoc(userRef, userData);
        }
        await setAuthSession(token, userData);
        return { token, user: userData };
      } catch (err) {
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
          throw new Error('ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।');
        }
        throw new Error(err.message || 'লগইন ব্যর্থ হয়েছে।');
      }
    }

    if (action === 'register') {
      try {
        const cred = await createUserWithEmailAndPassword(auth, body.email.trim(), body.password);
        const token = await cred.user.getIdToken();
        const userData = {
          id: cred.user.uid,
          uid: cred.user.uid,
          email: cred.user.email,
          name: body.name || body.email.split('@')[0],
          business_name: body.business_name || body.businessName || '',
          business_phone: body.business_phone || body.businessPhone || '',
          created_at: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', cred.user.uid), userData);
        await setAuthSession(token, userData);
        return { token, user: userData };
      } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
          throw new Error('এই ইমেইল দিয়ে ইতিমধ্যে একাউন্ট খোলা আছে।');
        }
        throw new Error(err.message || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে।');
      }
    }

    if (action === 'reset-password') {
      try {
        await sendPasswordResetEmail(auth, body.email.trim());
        return { message: 'পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে।' };
      } catch (err) {
        throw new Error(err.message || 'পাসওয়ার্ড রিসেট ব্যর্থ হয়েছে।');
      }
    }

    if (action === 'change-password') {
      if (!auth.currentUser) {
        throw new Error('অনুগ্রহ করে পুনরায় লগইন করুন।');
      }
      try {
        await updatePassword(auth.currentUser, body.newPassword);
        return { ok: true };
      } catch (err) {
        throw new Error(err.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে।');
      }
    }

    if (action === 'me') {
      const u = await getAuthUser();
      return { user: u };
    }
  }

  // Ensure user is authenticated for all business data
  const uid = await getCurrentUserId();
  if (!uid) {
    throw new Error('অনুরোধ ব্যর্থ হয়েছে: লগইন করা নেই।');
  }

  // 2. Contacts routes: /contacts or /contacts/:id
  if (segments[0] === 'contacts') {
    const contactId = segments[1];

    if (!contactId) {
      if (method === 'GET') {
        const typeFilter = searchParams.get('type');
        const contactsRef = collection(db, 'users', uid, 'contacts');
        const cSnap = await getDocs(contactsRef);
        let contacts = [];
        cSnap.forEach(d => contacts.push({ id: d.id, ...d.data() }));

        if (typeFilter) {
          contacts = contacts.filter(c => c.type === typeFilter);
        }

        // Calculate live balance from transactions
        const txsRef = collection(db, 'users', uid, 'transactions');
        const tSnap = await getDocs(txsRef);
        const balances = {};
        tSnap.forEach(d => {
          const t = d.data();
          if (!t.contact_id) return;
          if (!balances[t.contact_id]) balances[t.contact_id] = 0;
          const amt = Number(t.amount) || 0;
          if (t.direction === 'gave') balances[t.contact_id] += amt;
          else if (t.direction === 'got') balances[t.contact_id] -= amt;
        });

        contacts = contacts.map(c => ({
          ...c,
          balance: balances[c.id] || 0
        }));

        contacts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        return { contacts };
      }

      if (method === 'POST') {
        const body = options.body ? JSON.parse(options.body) : {};
        if (!body.name || !body.name.trim()) throw new Error('নাম আবশ্যক।');
        const id = 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const newContact = {
          id,
          user_id: uid,
          type: body.type || 'customer',
          name: body.name.trim(),
          phone: body.phone || '',
          note: body.note || '',
          created_at: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', uid, 'contacts', id), newContact);
        return { contact: { ...newContact, balance: 0 } };
      }
    } else {
      // /contacts/:id
      if (method === 'GET') {
        const cRef = doc(db, 'users', uid, 'contacts', contactId);
        const cSnap = await getDoc(cRef);
        if (!cSnap.exists()) throw new Error('Contact not found');
        const contact = { id: cSnap.id, ...cSnap.data() };

        // transactions for this contact
        const txsRef = collection(db, 'users', uid, 'transactions');
        const tSnap = await getDocs(txsRef);
        let transactions = [];
        let balance = 0;
        tSnap.forEach(d => {
          const t = { id: d.id, ...d.data() };
          if (t.contact_id === contactId) {
            transactions.push(t);
            const amt = Number(t.amount) || 0;
            if (t.direction === 'gave') balance += amt;
            else if (t.direction === 'got') balance -= amt;
          }
        });

        transactions.sort((a, b) => {
          const dA = a.occurred_at || a.created_at || '';
          const dB = b.occurred_at || b.created_at || '';
          return dB.localeCompare(dA);
        });

        return { contact: { ...contact, balance }, transactions };
      }

      if (method === 'PATCH') {
        const body = options.body ? JSON.parse(options.body) : {};
        const cRef = doc(db, 'users', uid, 'contacts', contactId);
        const curSnap = await getDoc(cRef);
        if (!curSnap.exists()) throw new Error('Contact not found');
        const updated = {
          ...curSnap.data(),
          ...(body.name !== undefined ? { name: body.name.trim() } : {}),
          ...(body.phone !== undefined ? { phone: body.phone } : {}),
          ...(body.note !== undefined ? { note: body.note } : {}),
        };
        await setDoc(cRef, updated);
        return { contact: updated };
      }

      if (method === 'DELETE') {
        await deleteDoc(doc(db, 'users', uid, 'contacts', contactId));
        return { ok: true };
      }
    }
  }

  // 3. Transactions routes: /transactions or /transactions/:id
  if (segments[0] === 'transactions') {
    const txId = segments[1];

    if (!txId) {
      if (method === 'GET') {
        const contactId = searchParams.get('contactId') || searchParams.get('contact_id');
        const category = searchParams.get('category');
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        const limitParam = parseInt(searchParams.get('limit') || '1000', 10);

        // Map contacts for contact_name
        const contactsRef = collection(db, 'users', uid, 'contacts');
        const cSnap = await getDocs(contactsRef);
        const contactsMap = {};
        cSnap.forEach(d => { contactsMap[d.id] = d.data(); });

        const txsRef = collection(db, 'users', uid, 'transactions');
        const tSnap = await getDocs(txsRef);
        let transactions = [];
        tSnap.forEach(d => {
          const t = { id: d.id, ...d.data() };
          const c = contactsMap[t.contact_id];
          t.contact_name = c ? c.name : '';
          t.contact_type = c ? c.type : '';
          transactions.push(t);
        });

        if (contactId) {
          transactions = transactions.filter(t => t.contact_id === contactId);
        }
        if (category) {
          transactions = transactions.filter(t => t.category === category);
        }
        if (from) {
          transactions = transactions.filter(t => (t.occurred_at || '').substring(0, 10) >= from);
        }
        if (to) {
          transactions = transactions.filter(t => (t.occurred_at || '').substring(0, 10) <= to);
        }

        transactions.sort((a, b) => {
          const dA = a.occurred_at || a.created_at || '';
          const dB = b.occurred_at || b.created_at || '';
          return dB.localeCompare(dA);
        });

        if (limitParam && transactions.length > limitParam) {
          transactions = transactions.slice(0, limitParam);
        }

        return { transactions };
      }

      if (method === 'POST') {
        const body = options.body ? JSON.parse(options.body) : {};
        const id = 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const nowIso = new Date().toISOString();
        let occurredAt = body.occurredAt || body.occurred_at || nowIso;
        if (/^\d{4}-\d{2}-\d{2}$/.test(occurredAt)) {
          const nowTime = new Date().toTimeString().split(' ')[0];
          occurredAt = `${occurredAt} ${nowTime}`;
        }

        const newTx = {
          id,
          user_id: uid,
          contact_id: body.contactId || body.contact_id || null,
          direction: body.direction || 'gave',
          amount: Number(body.amount) || 0,
          category: body.category || 'general',
          note: body.note || '',
          occurred_at: occurredAt,
          created_at: nowIso
        };
        await setDoc(doc(db, 'users', uid, 'transactions', id), newTx);
        return { transaction: newTx };
      }
    } else {
      // /transactions/:id
      if (method === 'PATCH') {
        const body = options.body ? JSON.parse(options.body) : {};
        const txRef = doc(db, 'users', uid, 'transactions', txId);
        const curSnap = await getDoc(txRef);
        if (!curSnap.exists()) throw new Error('Transaction not found');
        const cur = curSnap.data();

        let occ = cur.occurred_at;
        const inputOcc = body.occurredAt || body.occurred_at;
        if (inputOcc) {
          occ = inputOcc;
          if (/^\d{4}-\d{2}-\d{2}$/.test(occ)) {
            const nowTime = new Date().toTimeString().split(' ')[0];
            occ = `${occ} ${nowTime}`;
          }
        }

        const updated = {
          ...cur,
          ...(body.direction !== undefined ? { direction: body.direction } : {}),
          ...(body.amount !== undefined ? { amount: Number(body.amount) } : {}),
          ...(body.category !== undefined ? { category: body.category } : {}),
          ...(body.note !== undefined ? { note: body.note } : {}),
          occurred_at: occ
        };
        await setDoc(txRef, updated);
        return { transaction: updated };
      }

      if (method === 'DELETE') {
        await deleteDoc(doc(db, 'users', uid, 'transactions', txId));
        return { ok: true };
      }
    }
  }

  // 4. Dashboard Summary: /dashboard/summary
  if (segments[0] === 'dashboard' && segments[1] === 'summary') {
    const contactsRef = collection(db, 'users', uid, 'contacts');
    const cSnap = await getDocs(contactsRef);
    const contactsList = [];
    const contactsMap = {};
    cSnap.forEach(d => {
      const c = { id: d.id, ...d.data() };
      contactsList.push(c);
      contactsMap[c.id] = c;
    });

    const txsRef = collection(db, 'users', uid, 'transactions');
    const tSnap = await getDocs(txsRef);
    let totalGave = 0;
    let totalGot = 0;
    const catMap = {};
    const contactBalances = {};
    const txList = [];

    tSnap.forEach(d => {
      const t = { id: d.id, ...d.data() };
      const amt = Number(t.amount) || 0;
      if (t.direction === 'gave') totalGave += amt;
      if (t.direction === 'got') totalGot += amt;

      const cat = t.category || 'general';
      if (!catMap[cat]) catMap[cat] = { category: cat, gave: 0, got: 0 };
      if (t.direction === 'gave') catMap[cat].gave += amt;
      if (t.direction === 'got') catMap[cat].got += amt;

      if (t.contact_id) {
        if (!contactBalances[t.contact_id]) contactBalances[t.contact_id] = 0;
        if (t.direction === 'gave') contactBalances[t.contact_id] += amt;
        else if (t.direction === 'got') contactBalances[t.contact_id] -= amt;
      }

      t.contact_name = contactsMap[t.contact_id] ? contactsMap[t.contact_id].name : '';
      txList.push(t);
    });

    let totalReceivable = 0;
    let totalPayable = 0;
    for (const c of contactsList) {
      const bal = contactBalances[c.id] || 0;
      if (c.type === 'customer' && bal > 0) totalReceivable += bal;
      if (c.type === 'supplier' && bal > 0) totalPayable += bal;
    }

    txList.sort((a, b) => {
      const dA = a.occurred_at || a.created_at || '';
      const dB = b.occurred_at || b.created_at || '';
      return dB.localeCompare(dA);
    });

    return {
      netBalance: totalGave - totalGot,
      totalGave,
      totalGot,
      totalReceivable,
      totalPayable,
      byCategory: Object.values(catMap),
      recentTransactions: txList.slice(0, 10)
    };
  }

  // 5. Stock routes: /stock or /stock/:id
  if (segments[0] === 'stock') {
    const stockId = segments[1];
    if (!stockId) {
      if (method === 'GET') {
        const sRef = collection(db, 'users', uid, 'stock');
        const sSnap = await getDocs(sRef);
        const items = [];
        sSnap.forEach(d => items.push({ id: d.id, ...d.data() }));
        return { items };
      }
      if (method === 'POST') {
        const body = options.body ? JSON.parse(options.body) : {};
        const id = 'st_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const newItem = {
          id,
          user_id: uid,
          name: body.name || '',
          unit: body.unit || 'pcs',
          quantity: Number(body.quantity) || 0,
          unit_price: Number(body.unit_price) || 0,
          created_at: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', uid, 'stock', id), newItem);
        return { item: newItem };
      }
    } else {
      if (method === 'DELETE') {
        await deleteDoc(doc(db, 'users', uid, 'stock', stockId));
        return { ok: true };
      }
    }
  }

  return {};
}
