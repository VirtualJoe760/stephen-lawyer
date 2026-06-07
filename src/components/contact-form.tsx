"use client";

import { useState } from "react";
import { Input, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ContactForm() {
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState("loading");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(fd)),
      });
      if (res.ok) {
        setState("ok");
        e.currentTarget.reset();
      } else setState("error");
    } catch {
      setState("error");
    }
  };

  if (state === "ok") {
    return (
      <div className="border-2 border-ink p-8">
        <p className="wordmark text-3xl mb-2">Got it.</p>
        <p className="text-base">We'll respond within a couple business days.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 max-w-xl">
      <div className="grid sm:grid-cols-2 gap-5">
        <label className="block">
          <span className="font-mono text-xs uppercase tracking-widest mb-2 block">Name</span>
          <Input name="name" required />
        </label>
        <label className="block">
          <span className="font-mono text-xs uppercase tracking-widest mb-2 block">Email</span>
          <Input type="email" name="email" required />
        </label>
      </div>
      <label className="block">
        <span className="font-mono text-xs uppercase tracking-widest mb-2 block">Topic</span>
        <Select name="topic" required defaultValue="Order">
          <option>Order</option>
          <option>Wholesale</option>
          <option>Press</option>
          <option>Other</option>
        </Select>
      </label>
      <label className="block">
        <span className="font-mono text-xs uppercase tracking-widest mb-2 block">Message</span>
        <Textarea name="message" required />
      </label>
      <Button type="submit" disabled={state === "loading"} size="lg">
        {state === "loading" ? "Sending…" : "Send →"}
      </Button>
      {state === "error" && (
        <p className="font-mono text-xs uppercase tracking-widest text-hazard">
          Something broke. Try again, or email hello@stephenlawyer.clothing.
        </p>
      )}
    </form>
  );
}
