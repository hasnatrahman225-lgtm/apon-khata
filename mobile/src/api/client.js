// Memory fallback in case AsyncStorage native module is not ready or throws in Expo Go
const memoryStore = new Map();

let AsyncStorageModule = null;
try {
  AsyncStorageModule = require('@react-native-async-storage/async-storage').default;
} catch (e) {
  console.warn('AsyncStorage require error:', e);
}

const storage = {
  async getItem(key) {
    try {
      if (AsyncStorageModule && typeof AsyncStorageModule.getItem === 'function') {
        const val = await AsyncStorageModule.getItem(key);
        if (val !== null && val !== undefined) return val;
      }
    } catch (e) {
      // fallback to memory
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
      // ignore native error, memoryStore has it
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

// Live Production Cloud API URL
export const DEFAULT_API_URL = 'https://enthusiastic-love-production.up.railway.app';

const API_STORAGE_KEY = '@khata_api_base_url';
const TOKEN_STORAGE_KEY = '@khata_auth_token';
const USER_STORAGE_KEY = '@khata_auth_user';

export async function getBaseUrl() {
  // If running in a web browser (e.g. localhost:8082 or localhost:5175), use http://localhost:4000
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    return `http://${host}:4000`;
  }

  try {
    const customUrl = await storage.getItem(API_STORAGE_KEY);
    if (customUrl && !customUrl.includes('192.168.1.155') && !customUrl.includes('10.142.165.153')) {
      return customUrl;
    }
    return DEFAULT_API_URL;
  } catch (e) {
    return DEFAULT_API_URL;
  }
}

export async function setBaseUrl(url) {
  const cleanUrl = (url || '').replace(/\/+$/, '');
  await storage.setItem(API_STORAGE_KEY, cleanUrl);
}

export async function getAuthToken() {
  return await storage.getItem(TOKEN_STORAGE_KEY);
}

export async function setAuthSession(token, user) {
  if (token) await storage.setItem(TOKEN_STORAGE_KEY, token);
  if (user) await storage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export async function getAuthUser() {
  const raw = await storage.getItem(USER_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearAuthSession() {
  await storage.removeItem(TOKEN_STORAGE_KEY);
  await storage.removeItem(USER_STORAGE_KEY);
}

export async function apiRequest(endpoint, options = {}) {
  const baseUrl = await getBaseUrl();
  const token = await getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.error || `অনুরোধ ব্যর্থ হয়েছে (${res.status})`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    if (err.message && err.message.includes('Network request failed')) {
      throw new Error(`সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না। IP ঠিক আছে কিনা নিশ্চিত করুন: ${baseUrl}`);
    }
    throw err;
  }
}
