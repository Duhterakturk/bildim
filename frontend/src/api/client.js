import axios from "axios";

const apiClient = axios.create({
  // Yerel geliştirmede Vite proxy'si `/api`'yi backend'e yönlendirir. Üretim
  // static build'inde proxy yok, bu yüzden build zamanında `VITE_API_URL`
  // (ör. https://mindarena-backend.onrender.com/api) ayarlanmalı.
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 70000,
});

export function wakeApi() {
  const base = apiClient.defaults.baseURL || "/api";
  fetch(`${String(base).replace(/\/$/, "")}/health`, { cache: "no-store" }).catch(() => {});
}

export async function withWake(task, attempts = 2) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      const status = error.response?.status;
      const retry = !status || status >= 500 || error.code === "ECONNABORTED" || error.code === "ERR_NETWORK";
      if (!retry || attempt === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  throw lastError;
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("mindarena_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const USER_STORAGE_KEY = "mindarena_user";

export function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeStoredUser(user) {
  if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_STORAGE_KEY);
}

export function clearStoredSession() {
  localStorage.removeItem("mindarena_access_token");
  localStorage.removeItem("mindarena_refresh_token");
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function hasStoredSession() {
  return Boolean(
    localStorage.getItem("mindarena_access_token") || localStorage.getItem("mindarena_refresh_token"),
  );
}

export function isDefiniteAuthFailure(error) {
  const status = error?.response?.status;
  return status === 401 || status === 422;
}

let refreshPromise = null;

export function refreshSession() {
  if (!refreshPromise) refreshPromise = refreshAccess().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

function refreshAccess() {
  const refresh = localStorage.getItem("mindarena_refresh_token");
  if (!refresh) {
    const error = new Error("refresh yok");
    error.response = { status: 401 };
    return Promise.reject(error);
  }
  const base = String(apiClient.defaults.baseURL || "/api").replace(/\/$/, "");
  return axios
    .post(`${base}/auth/refresh`, {}, { headers: { Authorization: `Bearer ${refresh}` }, timeout: 70000 })
    .then(({ data }) => {
      localStorage.setItem("mindarena_access_token", data.access_token);
      if (data.refresh_token) localStorage.setItem("mindarena_refresh_token", data.refresh_token);
      return data.access_token;
    });
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    const url = String(config.url || "");
    if (error.response?.status !== 401 || config._retried || /\/auth\/(login|register|refresh)/.test(url)) {
      return Promise.reject(error);
    }
    try {
      await refreshSession();
      config._retried = true;
      return apiClient(config);
    } catch (refreshError) {
      if (isDefiniteAuthFailure(refreshError)) {
        clearStoredSession();
        if (!window.location.pathname.startsWith("/login")) window.location.assign("/login");
      }
      return Promise.reject(refreshError);
    }
  },
);

export function scoreStatus(error) {
  const status = error?.response?.status;
  if (status === 400) return "rejected";
  if (status === 404 || status === 409) return "already";
  const network = !error?.response || error?.code === "ERR_NETWORK" || error?.code === "ECONNABORTED";
  if (network || status >= 500) return "offline";
  return "rejected";
}

export default apiClient;
