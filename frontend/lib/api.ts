import { getAppPassword, clearAppPassword } from "./auth";

export function getApiBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window !== "undefined") {
    const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
    if (localHosts.has(window.location.hostname)) {
      return `http://${window.location.hostname === "::1" ? "[::1]" : window.location.hostname}:8080`;
    }
  }

  // Fall back to same-origin and let Next.js proxy /api and /uploads to backend.
  return "";
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const url = `${getApiBaseUrl()}${endpoint}`;
  const password = getAppPassword();

  const headers = new Headers(options.headers);
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (password) {
    headers.set("X-App-Password", password);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAppPassword(); // optionally clear it
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("unauthorized"));
    }
    throw new ApiError("Brak autoryzacji", 401);
  }

  if (!response.ok) {
    let msg = `Wystąpił błąd API (${response.status})`;
    try {
      const text = await response.text();
      if (text) {
        try {
          const data = JSON.parse(text);
          msg = data.message || data.error || text;
        } catch {
          msg = text;
        }
      }
    } catch {}
    throw new ApiError(msg, response.status);
  }

  return response.json();
}

export const api = {
  get: (endpoint: string) => fetchWithAuth(endpoint),
  post: (endpoint: string, body: unknown) =>
    fetchWithAuth(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  postFormData: (endpoint: string, body: FormData) =>
    fetchWithAuth(endpoint, {
      method: "POST",
      body,
    }),
  getBlob: async (endpoint: string) => {
    const url = `${getApiBaseUrl()}${endpoint}`;
    const password = getAppPassword();
    const headers = new Headers();
    if (password) headers.set("X-App-Password", password);

    const response = await fetch(url, { headers });
    if (response.status === 401) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("unauthorized"));
      }
      throw new ApiError("Brak autoryzacji", 401);
    }
    if (!response.ok) throw new ApiError("Błąd pobierania pliku", response.status);
    return response.blob();
  },
};
