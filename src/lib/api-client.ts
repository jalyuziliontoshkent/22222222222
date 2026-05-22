"use client";

import { clearAuth, getStoredToken } from "@/lib/client-auth";

export async function apiRequest<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  const token = getStoredToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`/api${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (response.status === 401 && !path.includes("/auth/login")) {
    clearAuth();
    throw new Error("Sessiya tugadi. Qayta kiring.");
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.detail || errorBody?.message || "So'rovni bajarib bo'lmadi.",
    );
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.blob() as Promise<T>;
}
