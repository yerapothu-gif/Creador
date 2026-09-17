const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

export const authApi = {
  signup: (body) => request("/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
};

export const contentApi = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/content${qs ? `?${qs}` : ""}`);
  },
  getById: (id) => request(`/content/${id}`),
};

export const goalsApi = {
  create: (body) => request("/goals", { method: "POST", body: JSON.stringify(body) }),
  getMe: () => request("/goals/me"),
  completeModule: (goalId, day) =>
    request(`/goals/${goalId}/modules/${day}/complete`, { method: "POST" }),
};

export const botApi = {
  query: (body) => request("/bot/query", { method: "POST", body: JSON.stringify(body) }),
};

export const adminApi = {
  createContent: (body) =>
    request("/admin/content", { method: "POST", body: JSON.stringify(body) }),
  updateContent: (id, body) =>
    request(`/admin/content/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteContent: (id) =>
    request(`/admin/content/${id}`, { method: "DELETE" }),
};
