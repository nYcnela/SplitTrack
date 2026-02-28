import { getAppPassword, clearAppPassword } from "./auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const password = getAppPassword();

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
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
    let msg = "Wystąpił błąd API";
    try {
      const data = await response.json();
      msg = data.message || msg;
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
  getBlob: async (endpoint: string) => {
    const url = `${BASE_URL}${endpoint}`;
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
