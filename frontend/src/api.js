import { auth, db } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

const TOKEN_KEY = "khata_token";
const USER_KEY = "khata_user";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setStoredUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

async function getCurrentUserId() {
  if (auth.currentUser && auth.currentUser.uid) {
    return auth.currentUser.uid;
  }
  const u = getStoredUser();
  if (u && (u.uid || u.id)) return u.uid || u.id;
  return null;
}

export const api = {
  register: async ({ email, password, name, businessName, businessPhone }) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const token = await cred.user.getIdToken();
      const userData = {
        id: cred.user.uid,
        uid: cred.user.uid,
        email: cred.user.email,
        name: name || email.split("@")[0],
        business_name: businessName || "",
        business_phone: businessPhone || "",
        created_at: new Date().toISOString(),
      };
      await setDoc(doc(db, "users", cred.user.uid), userData);
      setToken(token);
      setStoredUser(userData);
      return { token, user: userData };
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        throw new Error("এই ইমেইল দিয়ে ইতিমধ্যে একাউন্ট খোলা আছে।");
      }
      throw new Error(err.message || "রেজিস্ট্রেশন ব্যর্থ হয়েছে।");
    }
  },

  login: async ({ email, password }) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const token = await cred.user.getIdToken();
      const userRef = doc(db, "users", cred.user.uid);
      const userSnap = await getDoc(userRef);
      let userData = {
        id: cred.user.uid,
        uid: cred.user.uid,
        email: cred.user.email,
        name: cred.user.displayName || email.split("@")[0],
      };
      if (userSnap.exists()) {
        userData = { ...userData, ...userSnap.data() };
      } else {
        await setDoc(userRef, userData);
      }
      setToken(token);
      setStoredUser(userData);
      return { token, user: userData };
    } catch (err) {
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      ) {
        throw new Error("ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।");
      }
      throw new Error(err.message || "লগইন ব্যর্থ হয়েছে।");
    }
  },

  loginWithGoogle: async (idToken) => {
    throw new Error("Google login requires Firebase popup or credential.");
  },

  me: async () => {
    const u = getStoredUser();
    return { user: u };
  },

  updateProfile: async (payload) => {
    const uid = await getCurrentUserId();
    if (!uid) throw new Error("লগইন করা নেই।");
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    const cur = snap.exists() ? snap.data() : {};
    const updated = {
      ...cur,
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.business_name !== undefined ? { business_name: payload.business_name } : {}),
      ...(payload.business_phone !== undefined ? { business_phone: payload.business_phone } : {}),
    };
    await setDoc(userRef, updated);
    setStoredUser(updated);
    return { user: updated };
  },

  resetPassword: async ({ email }) => {
    await sendPasswordResetEmail(auth, email.trim());
    return { message: "পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে।" };
  },

  changePassword: async ({ newPassword }) => {
    if (!auth.currentUser) throw new Error("অনুগ্রহ করে পুনরায় লগইন করুন।");
    await updatePassword(auth.currentUser, newPassword);
    return { ok: true };
  },

  listContacts: async (type) => {
    const uid = await getCurrentUserId();
    if (!uid) throw new Error("লগইন করা নেই।");

    const contactsRef = collection(db, "users", uid, "contacts");
    const cSnap = await getDocs(contactsRef);
    let contacts = [];
    cSnap.forEach((d) => contacts.push({ id: d.id, ...d.data() }));

    if (type) {
      contacts = contacts.filter((c) => c.type === type);
    }

    const txsRef = collection(db, "users", uid, "transactions");
    const tSnap = await getDocs(txsRef);
    const balances = {};
    tSnap.forEach((d) => {
      const t = d.data();
      if (!t.contact_id) return;
      if (!balances[t.contact_id]) balances[t.contact_id] = 0;
      const amt = Number(t.amount) || 0;
      if (t.direction === "gave") balances[t.contact_id] += amt;
      else if (t.direction === "got") balances[t.contact_id] -= amt;
    });

    contacts = contacts.map((c) => ({
      ...c,
      balance: balances[c.id] || 0,
    }));

    contacts.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return { contacts };
  },

  createContact: async (payload) => {
    const uid = await getCurrentUserId();
    if (!uid) throw new Error("লগইন করা নেই।");
    if (!payload.name || !payload.name.trim()) throw new Error("নাম আবশ্যক।");
    const id = "c_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
    const newContact = {
      id,
      user_id: uid,
      type: payload.type || "customer",
      name: payload.name.trim(),
      phone: payload.phone || "",
      note: payload.note || "",
      created_at: new Date().toISOString(),
    };
    await setDoc(doc(db, "users", uid, "contacts", id), newContact);
    return { contact: { ...newContact, balance: 0 } };
  },

  getContact: async (id) => {
    const uid = await getCurrentUserId();
    if (!uid) throw new Error("লগইন করা নেই।");
    const cRef = doc(db, "users", uid, "contacts", id);
    const cSnap = await getDoc(cRef);
    if (!cSnap.exists()) throw new Error("Contact not found");
    const contact = { id: cSnap.id, ...cSnap.data() };

    const txsRef = collection(db, "users", uid, "transactions");
    const tSnap = await getDocs(txsRef);
    let transactions = [];
    let balance = 0;
    tSnap.forEach((d) => {
      const t = { id: d.id, ...d.data() };
      if (t.contact_id === id) {
        transactions.push(t);
        const amt = Number(t.amount) || 0;
        if (t.direction === "gave") balance += amt;
        else if (t.direction === "got") balance -= amt;
      }
    });

    transactions.sort((a, b) => {
      const dA = a.occurred_at || a.created_at || "";
      const dB = b.occurred_at || b.created_at || "";
      return dB.localeCompare(dA);
    });

    return { contact: { ...contact, balance }, transactions };
  },

  deleteContact: async (id) => {
    const uid = await getCurrentUserId();
    if (!uid) throw new Error("লগইন করা নেই।");
    await deleteDoc(doc(db, "users", uid, "contacts", id));
    return { ok: true };
  },

  listTransactions: async (params = {}) => {
    const uid = await getCurrentUserId();
    if (!uid) throw new Error("লগইন করা নেই।");

    const contactsRef = collection(db, "users", uid, "contacts");
    const cSnap = await getDocs(contactsRef);
    const contactsMap = {};
    cSnap.forEach((d) => {
      contactsMap[d.id] = d.data();
    });

    const txsRef = collection(db, "users", uid, "transactions");
    const tSnap = await getDocs(txsRef);
    let transactions = [];
    tSnap.forEach((d) => {
      const t = { id: d.id, ...d.data() };
      const c = contactsMap[t.contact_id];
      t.contact_name = c ? c.name : "";
      t.contact_type = c ? c.type : "";
      transactions.push(t);
    });

    const contactId = params.contactId || params.contact_id;
    if (contactId) {
      transactions = transactions.filter((t) => t.contact_id === contactId);
    }
    if (params.category) {
      transactions = transactions.filter((t) => t.category === params.category);
    }
    if (params.from) {
      transactions = transactions.filter((t) => (t.occurred_at || "").substring(0, 10) >= params.from);
    }
    if (params.to) {
      transactions = transactions.filter((t) => (t.occurred_at || "").substring(0, 10) <= params.to);
    }

    transactions.sort((a, b) => {
      const dA = a.occurred_at || a.created_at || "";
      const dB = b.occurred_at || b.created_at || "";
      return dB.localeCompare(dA);
    });

    const limitParam = parseInt(params.limit || "1000", 10);
    if (limitParam && transactions.length > limitParam) {
      transactions = transactions.slice(0, limitParam);
    }

    return { transactions };
  },

  createTransaction: async (payload) => {
    const uid = await getCurrentUserId();
    if (!uid) throw new Error("লগইন করা নেই।");
    const id = "tx_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
    const nowIso = new Date().toISOString();
    let occurredAt = payload.occurredAt || payload.occurred_at || nowIso;
    if (/^\d{4}-\d{2}-\d{2}$/.test(occurredAt)) {
      const nowTime = new Date().toTimeString().split(" ")[0];
      occurredAt = `${occurredAt} ${nowTime}`;
    }

    const newTx = {
      id,
      user_id: uid,
      contact_id: payload.contactId || payload.contact_id || null,
      direction: payload.direction || "gave",
      amount: Number(payload.amount) || 0,
      category: payload.category || "general",
      note: payload.note || "",
      occurred_at: occurredAt,
      created_at: nowIso,
    };
    await setDoc(doc(db, "users", uid, "transactions", id), newTx);
    return { transaction: newTx };
  },

  updateTransaction: async (id, payload) => {
    const uid = await getCurrentUserId();
    if (!uid) throw new Error("লগইন করা নেই।");
    const txRef = doc(db, "users", uid, "transactions", id);
    const snap = await getDoc(txRef);
    if (!snap.exists()) throw new Error("Transaction not found");
    const cur = snap.data();

    let occ = cur.occurred_at;
    const inputOcc = payload.occurredAt || payload.occurred_at;
    if (inputOcc) {
      occ = inputOcc;
      if (/^\d{4}-\d{2}-\d{2}$/.test(occ)) {
        const nowTime = new Date().toTimeString().split(" ")[0];
        occ = `${occ} ${nowTime}`;
      }
    }

    const updated = {
      ...cur,
      ...(payload.direction !== undefined ? { direction: payload.direction } : {}),
      ...(payload.amount !== undefined ? { amount: Number(payload.amount) } : {}),
      ...(payload.category !== undefined ? { category: payload.category } : {}),
      ...(payload.note !== undefined ? { note: payload.note } : {}),
      occurred_at: occ,
    };
    await setDoc(txRef, updated);
    return { transaction: updated };
  },

  deleteTransaction: async (id) => {
    const uid = await getCurrentUserId();
    if (!uid) throw new Error("লগইন করা নেই।");
    await deleteDoc(doc(db, "users", uid, "transactions", id));
    return { ok: true };
  },

  listStock: async () => {
    const uid = await getCurrentUserId();
    if (!uid) throw new Error("লগইন করা নেই।");
    const sRef = collection(db, "users", uid, "stock");
    const sSnap = await getDocs(sRef);
    const items = [];
    sSnap.forEach((d) => items.push({ id: d.id, ...d.data() }));
    return { items };
  },

  createStock: async (payload) => {
    const uid = await getCurrentUserId();
    if (!uid) throw new Error("লগইন করা নেই।");
    const id = "st_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
    const newItem = {
      id,
      user_id: uid,
      name: payload.name || "",
      unit: payload.unit || "pcs",
      quantity: Number(payload.quantity) || 0,
      unit_price: Number(payload.unit_price) || 0,
      created_at: new Date().toISOString(),
    };
    await setDoc(doc(db, "users", uid, "stock", id), newItem);
    return { item: newItem };
  },

  deleteStock: async (id) => {
    const uid = await getCurrentUserId();
    if (!uid) throw new Error("লগইন করা নেই।");
    await deleteDoc(doc(db, "users", uid, "stock", id));
    return { ok: true };
  },

  summary: async () => {
    const uid = await getCurrentUserId();
    if (!uid) throw new Error("লগইন করা নেই।");

    const contactsRef = collection(db, "users", uid, "contacts");
    const cSnap = await getDocs(contactsRef);
    const contactsList = [];
    const contactsMap = {};
    cSnap.forEach((d) => {
      const c = { id: d.id, ...d.data() };
      contactsList.push(c);
      contactsMap[c.id] = c;
    });

    const txsRef = collection(db, "users", uid, "transactions");
    const tSnap = await getDocs(txsRef);
    let totalGave = 0;
    let totalGot = 0;
    const catMap = {};
    const contactBalances = {};
    const txList = [];

    tSnap.forEach((d) => {
      const t = { id: d.id, ...d.data() };
      const amt = Number(t.amount) || 0;
      if (t.direction === "gave") totalGave += amt;
      if (t.direction === "got") totalGot += amt;

      const cat = t.category || "general";
      if (!catMap[cat]) catMap[cat] = { category: cat, gave: 0, got: 0 };
      if (t.direction === "gave") catMap[cat].gave += amt;
      if (t.direction === "got") catMap[cat].got += amt;

      if (t.contact_id) {
        if (!contactBalances[t.contact_id]) contactBalances[t.contact_id] = 0;
        if (t.direction === "gave") contactBalances[t.contact_id] += amt;
        else if (t.direction === "got") contactBalances[t.contact_id] -= amt;
      }

      t.contact_name = contactsMap[t.contact_id] ? contactsMap[t.contact_id].name : "";
      txList.push(t);
    });

    let totalReceivable = 0;
    let totalPayable = 0;
    for (const c of contactsList) {
      const bal = contactBalances[c.id] || 0;
      if (c.type === "customer" && bal > 0) totalReceivable += bal;
      if (c.type === "supplier" && bal > 0) totalPayable += bal;
    }

    txList.sort((a, b) => {
      const dA = a.occurred_at || a.created_at || "";
      const dB = b.occurred_at || b.created_at || "";
      return dB.localeCompare(dA);
    });

    return {
      netBalance: totalGave - totalGot,
      totalGave,
      totalGot,
      totalReceivable,
      totalPayable,
      byCategory: Object.values(catMap),
      recentTransactions: txList.slice(0, 10),
    };
  },
};
