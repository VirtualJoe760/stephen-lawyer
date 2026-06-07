"use client";

import { useState } from "react";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Address {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
}

const COUNTRIES = ["US", "CA", "MX", "GB", "AU", "DE", "FR", "JP"];

export function AddressManager({ initial }: { initial: Address[] }) {
  const [list, setList] = useState<Address[]>(initial);
  const [adding, setAdding] = useState(false);

  const add = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd) as Record<string, string>;
    const res = await fetch("/api/account/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const created = (await res.json()) as Address;
      setList((prev) => [...prev, created]);
      setAdding(false);
    } else {
      alert("Could not save address.");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    const res = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
    if (res.ok) setList((p) => p.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-8">
      {list.length === 0 && !adding && (
        <div className="border-2 border-dashed border-ink/30 py-16 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-3">No addresses saved</p>
          <button onClick={() => setAdding(true)} className="underline font-mono text-sm uppercase tracking-widest">
            Add an address →
          </button>
        </div>
      )}

      {list.length > 0 && (
        <ul className="grid sm:grid-cols-2 gap-4">
          {list.map((a) => (
            <li key={a.id} className="border-2 border-ink p-5">
              <p className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-2">
                {a.label ?? "Address"}{a.isDefault ? " · Default" : ""}
              </p>
              <address className="not-italic text-sm leading-relaxed">
                {a.line1}<br />
                {a.line2 && <>{a.line2}<br /></>}
                {a.city}, {a.region} {a.postalCode}<br />
                {a.country}
              </address>
              <button
                onClick={() => remove(a.id)}
                className="mt-3 font-mono text-[10px] uppercase tracking-widest text-ink/60 hover:text-hazard"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <form onSubmit={add} className="space-y-4 border-2 border-ink p-6">
          <h3 className="wordmark text-2xl">New address</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block"><span className="font-mono text-xs uppercase tracking-widest mb-2 block">Label</span><Input name="label" placeholder="Home" /></label>
            <label className="block"><span className="font-mono text-xs uppercase tracking-widest mb-2 block">Phone</span><Input name="phone" /></label>
            <label className="block sm:col-span-2"><span className="font-mono text-xs uppercase tracking-widest mb-2 block">Address line 1</span><Input name="line1" required /></label>
            <label className="block sm:col-span-2"><span className="font-mono text-xs uppercase tracking-widest mb-2 block">Address line 2</span><Input name="line2" /></label>
            <label className="block"><span className="font-mono text-xs uppercase tracking-widest mb-2 block">City</span><Input name="city" required /></label>
            <label className="block"><span className="font-mono text-xs uppercase tracking-widest mb-2 block">State/Region</span><Input name="region" required /></label>
            <label className="block"><span className="font-mono text-xs uppercase tracking-widest mb-2 block">Postal code</span><Input name="postalCode" required /></label>
            <label className="block">
              <span className="font-mono text-xs uppercase tracking-widest mb-2 block">Country</span>
              <Select name="country" required defaultValue="US">
                {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </label>
          </div>
          <div className="flex gap-3">
            <Button type="submit">Save</Button>
            <Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </form>
      ) : list.length > 0 ? (
        <button onClick={() => setAdding(true)} className="font-mono text-xs uppercase tracking-widest underline hover:text-hazard">
          + Add another address
        </button>
      ) : null}
    </div>
  );
}
