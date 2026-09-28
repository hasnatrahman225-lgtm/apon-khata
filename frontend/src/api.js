const API_BASE = import.meta.env.VITE_API_BASE || (
  typeof window !== "undefined" && (window.location.port === "5173" || window.location.port === "5175")
    ? `http://${window.location.hostname}:4000`
    : ""
);

function getToken() {
  return localStorage.getItem("khata_token");
}

export function setToken(token) {
  if (token) localStorage.setItem("khata_token", token);
  else localStorage.removeItem("khata_token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "কিছু একটা সমস্যা হয়েছে।");
  }
  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),
  loginWithGoogle: (idToken) => request("/auth/google", { method: "POST", body: { idToken }, auth: false }),
  me: () => request("/auth/me"),
  updateProfile: (payload) => request("/auth/profile", { method: "PATCH", body: payload }),
  resetPassword: (payload) => request("/auth/reset-password", { method: "POST", body: payload, auth: false }),
  changePassword: (payload) => request("/auth/change-password", { method: "POST", body: payload }),

  listContacts: (type) => request(`/contacts${type ? `?type=${type}` : ""}`),
  createContact: (payload) => request("/contacts", { method: "POST", body: payload }),
  getContact: (id) => request(`/contacts/${id}`),
  deleteContact: (id) => request(`/contacts/${id}`, { method: "DELETE" }),

  listTransactions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/transactions${qs ? `?${qs}` : ""}`);
  },
  createTransaction: (payload) => request("/transactions", { method: "POST", body: payload }),
  updateTransaction: (id, payload) => request(`/transactions/${id}`, { method: "PATCH", body: payload }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: "DELETE" }),

  listStock: () => request("/stock"),
  createStock: (payload) => request("/stock", { method: "POST", body: payload }),
  deleteStock: (id) => request(`/stock/${id}`, { method: "DELETE" }),

  summary: () => request("/dashboard/summary"),
};
