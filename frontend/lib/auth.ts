export function getAppPassword(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("appPassword");
}

export function setAppPassword(password: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("appPassword", password);
}

export function clearAppPassword() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("appPassword");
}
