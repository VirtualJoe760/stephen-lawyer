"use client";

import { brand } from "@/lib/brand";

// "Login with Nano Crew" for the store /admin — the SAME Supabase account as the
// Nano Crew app, via the REST API (no SDK). Magic-link (works for Google-auth
// creators) or password. Config now comes from brand.json (env-less, like a template).

const SUPABASE_URL = brand.platform.supabaseUrl;
const SUPABASE_ANON = brand.platform.supabaseAnonKey;
const API_BASE = brand.apiBase;

const TOKEN_KEY = "storefront.adminToken";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function signOut() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

/** Capture #access_token=… after a magic-link redirect. Returns true if signed in. */
export function captureTokenFromUrl(): boolean {
  if (typeof window === "undefined") return false;
  const m = window.location.hash.match(/access_token=([^&]+)/);
  if (!m) return !!getToken();
  try {
    localStorage.setItem(TOKEN_KEY, m[1]);
    history.replaceState(null, "", window.location.pathname);
  } catch {}
  return true;
}

export async function sendMagicLink(email: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      create_user: false,
      options: { email_redirect_to: `${window.location.origin}/admin` },
    }),
  });
  if (!res.ok) throw new Error("Could not send the sign-in link — use the email on your Nanocrew account.");
}

export async function passwordLogin(email: string, password: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const d = (await res.json()) as { access_token?: string; error_description?: string; msg?: string };
  if (!d.access_token) throw new Error(d.error_description ?? d.msg ?? "Sign-in failed");
  localStorage.setItem(TOKEN_KEY, d.access_token);
}

export async function creatorApi<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const token = getToken();
  if (!token) throw new Error("signed out");
  const res = await fetch(`${API_BASE}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
  });
  if (res.status === 401) {
    signOut();
    throw new Error("signed out");
  }
  if (!res.ok) {
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(d.error ?? `request failed (${res.status})`);
  }
  return (await res.json()) as T;
}
