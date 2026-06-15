"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/lib/utils";
import {
  captureTokenFromUrl,
  creatorApi,
  getToken,
  passwordLogin,
  sendMagicLink,
  signOut,
} from "@/lib/platform-auth";

// The store dashboard: revenue, orders, traffic — "Login with Nanocrew" (the same
// Supabase account as the app). Design/products are managed in the Nanocrew app.

const STORE_SLUG = "stephen-lawyer";

// Statuses where a full refund is still possible (mirrors the platform's REFUNDABLE list).
const REFUNDABLE = new Set([
  "paid",
  "submitted_to_printful",
  "in_production",
  "shipped",
  "delivered",
  "on_hold",
  "returned",
]);

type Stats = {
  stores: { slug: string; name: string; orders: number; revenueCents: number; views30d: number }[];
};
type Orders = {
  orders: {
    id: string;
    storeSlug?: string;
    customerEmail: string;
    status: string;
    totalCents: number;
    createdAt: string;
    trackingUrl: string | null;
  }[];
};

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Orders | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  useEffect(() => {
    setAuthed(captureTokenFromUrl() || !!getToken());
  }, []);

  const load = useCallback(async () => {
    try {
      const [s, o] = await Promise.all([
        creatorApi<Stats>("/api/creator/stats"),
        creatorApi<Orders>("/api/creator/orders"),
      ]);
      setStats(s);
      setOrders(o);
    } catch {
      setAuthed(false);
    }
  }, []);

  useEffect(() => {
    if (authed) void load();
  }, [authed, load]);

  const refund = async (id: string) => {
    if (!window.confirm("Refund this order in full? The customer is paid back and any transfer is reversed.")) return;
    setRefundingId(id);
    try {
      await creatorApi(`/api/creator/orders/${id}/refund`, { method: "POST" });
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Refund failed");
    } finally {
      setRefundingId(null);
    }
  };

  if (authed === null) return null;

  if (!authed) {
    return (
      <div className="px-4 md:px-8 py-24">
        <div className="max-w-md mx-auto">
          <h1 className="wordmark text-5xl md:text-7xl mb-2">Store admin</h1>
          <p className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-10">
            Sign in with your Nanocrew account.
          </p>
          <div className="space-y-3">
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full bg-transparent border-2 border-ink px-4 font-mono text-sm placeholder:text-ink/40 focus:outline-none focus:border-hazard"
            />
            {usePassword ? (
              <input
                type="password"
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full bg-transparent border-2 border-ink px-4 font-mono text-sm placeholder:text-ink/40 focus:outline-none focus:border-hazard"
              />
            ) : null}
            <button
              type="button"
              onClick={async () => {
                setNotice(null);
                try {
                  if (usePassword) {
                    await passwordLogin(email.trim(), password);
                    setAuthed(true);
                  } else {
                    await sendMagicLink(email.trim());
                    setNotice("Check your email — the sign-in link lands you back here.");
                  }
                } catch (e) {
                  setNotice(e instanceof Error ? e.message : "Sign-in failed");
                }
              }}
              className="w-full h-12 bg-ink text-bone font-mono text-sm uppercase tracking-widest hover:bg-hazard hover:text-ink transition-colors"
            >
              {usePassword ? "Sign in" : "Email me a sign-in link"}
            </button>
            <button
              type="button"
              className="w-full text-center font-mono text-xs uppercase tracking-widest text-ink/60 underline"
              onClick={() => setUsePassword((p) => !p)}
            >
              {usePassword ? "Use a magic link instead" : "Use a password instead"}
            </button>
            {notice ? <p className="font-mono text-xs text-ink/70">{notice}</p> : null}
          </div>
        </div>
      </div>
    );
  }

  const mine = stats?.stores.find((s) => s.slug === STORE_SLUG) ?? stats?.stores[0];

  return (
    <div className="px-4 md:px-8 py-16">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="wordmark text-5xl md:text-7xl">Store admin</h1>
          <button
            type="button"
            className="font-mono text-xs uppercase tracking-widest text-ink/60 underline"
            onClick={() => {
              signOut();
              setAuthed(false);
            }}
          >
            Sign out
          </button>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Revenue", value: mine ? formatMoney(mine.revenueCents) : "—" },
            { label: "Orders", value: mine?.orders ?? "—" },
            { label: "Views · 30d", value: mine?.views30d ?? "—" },
          ].map((stat) => (
            <div key={stat.label} className="border-2 border-ink p-5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-ink/60">{stat.label}</div>
              <div className="wordmark text-3xl mt-2">{stat.value}</div>
            </div>
          ))}
        </div>

        <h2 className="mt-14 font-mono text-xs uppercase tracking-widest text-ink/60">Recent orders</h2>
        {orders?.orders.length ? (
          <ul className="mt-4 border-y-2 border-ink divide-y-2 divide-ink/15">
            {orders.orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-4 py-4 font-mono text-sm">
                <div>
                  <div className="font-medium">{o.customerEmail}</div>
                  <div className="mt-0.5 text-ink/60 text-xs uppercase tracking-widest">
                    {new Date(o.createdAt).toLocaleDateString()} · {o.status.replaceAll("_", " ")}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {o.trackingUrl ? (
                    <a href={o.trackingUrl} className="text-ink/60 underline" target="_blank" rel="noreferrer">
                      Tracking
                    </a>
                  ) : null}
                  {REFUNDABLE.has(o.status) ? (
                    <button
                      type="button"
                      className="text-ink/60 underline disabled:opacity-50"
                      onClick={() => refund(o.id)}
                      disabled={refundingId === o.id}
                    >
                      {refundingId === o.id ? "Refunding…" : "Refund"}
                    </button>
                  ) : o.status === "refunded" ? (
                    <span className="text-ink/60">Refunded</span>
                  ) : null}
                  <span className="font-medium">{formatMoney(o.totalCents)}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 font-mono text-sm text-ink/60">No orders yet.</p>
        )}

        <p className="mt-14 font-mono text-xs uppercase tracking-widest text-ink/50">
          Design products, manage your catalogue, and edit this site from the Nanocrew app.
        </p>
      </div>
    </div>
  );
}
