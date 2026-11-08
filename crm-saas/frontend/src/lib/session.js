export function demoSession() {
  try {
    return JSON.parse(sessionStorage.getItem("flowdesck.demo") || "null");
  } catch {
    return null;
  }
}
export const isDemoGuest = () => demoSession()?.user?.role === "DEMO_GUEST";
export const sessionToken = () =>
  demoSession()?.token || localStorage.getItem("token");
export const sessionUser = () =>
  demoSession()?.user || JSON.parse(localStorage.getItem("user") || "{}");
export function clearSession() {
  if (demoSession()) sessionStorage.removeItem("flowdesck.demo");
  else {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
}
