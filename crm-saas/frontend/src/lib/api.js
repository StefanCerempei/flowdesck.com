import axios from "axios";
export const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL || "") + "/api",
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = "Bearer " + token;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.assign("/login");
    }
    return Promise.reject(error);
  },
);
export const errorMessage = (error) =>
  error.response?.data?.error?.message ||
  error.response?.data?.eroare ||
  "Could not reach the server. Please try again.";
export function canManage() {
  try {
    return ["ADMIN", "SUPER_ADMIN"].includes(
      JSON.parse(localStorage.getItem("user") || "{}").role,
    );
  } catch {
    return false;
  }
}
export async function allPages(path, params = {}, signal) {
  let items = [],
    cursor;
  do {
    const { data } = await api.get(path, {
      params: { ...params, limit: 100, ...(cursor ? { cursor } : {}) },
      signal,
    });
    items.push(...data.items);
    cursor = data.nextCursor;
  } while (cursor);
  return items;
}
export function operatingToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function nextDay(date) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
export const euros = (value) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    value,
  );
