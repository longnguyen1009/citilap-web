"use client";

export function getAdminToken(): string | null {
  // The credential is HttpOnly and intentionally cannot be read by JavaScript.
  return null;
}

export function setAdminToken(token: string): void {
  void token;
}

export function clearAdminToken(): void {
  // Logout is performed by the server so the HttpOnly cookie can be cleared.
}

export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const hasBody = init.body !== undefined && init.body !== null;
  if (hasBody && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(input, { ...init, headers, credentials: "same-origin" });
}

export function isAdminAuthenticated(): boolean {
  return false;
}
