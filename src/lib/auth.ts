/**
 * Client-side session helpers.
 *
 * Authentication is an HttpOnly cookie set by the server — JavaScript can never
 * read the session token, and nothing is stored in localStorage. The current
 * user is fetched from the server instead of being cached in the browser.
 */
import { authApi } from "./api";
import type { AdminUser } from "@/types";

let cached: AdminUser | null = null;
let inflight: Promise<AdminUser | null> | null = null;

/** Fetch (and cache for this page load) the signed-in user. */
export async function fetchCurrentUser(force = false): Promise<AdminUser | null> {
  if (cached && !force) return cached;
  if (inflight && !force) return inflight;
  inflight = authApi
    .me()
    .then((user) => {
      cached = user;
      return user;
    })
    .catch(() => {
      cached = null;
      return null;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function currentUser(): AdminUser | null {
  return cached;
}

export function clearAuthCache(): void {
  cached = null;
}

/** Sign out on the server and send the browser to the login screen. */
export async function signOut(): Promise<void> {
  clearAuthCache();
  await authApi.logout();
  if (typeof window !== "undefined") window.location.href = "/login";
}

/** @deprecated Retained so older imports keep working; there is no token to store. */
export function clearAuth(): void {
  clearAuthCache();
}
