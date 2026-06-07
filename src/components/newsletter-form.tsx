"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setState(res.ok ? "ok" : "error");
      if (res.ok) setEmail("");
    } catch {
      setState("error");
    }
  };

  if (state === "ok") {
    return (
      <p className="font-mono text-sm uppercase tracking-widest">
        You're in. Watch your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
      <Input
        type="email"
        required
        placeholder="you@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="sm:flex-1"
      />
      <Button type="submit" disabled={state === "loading"} variant="ink" size="lg">
        {state === "loading" ? "…" : "Submit"}
      </Button>
      {state === "error" && (
        <p className="font-mono text-xs uppercase tracking-widest text-hazard mt-1 sm:basis-full">
          Couldn't sign up. Try again.
        </p>
      )}
    </form>
  );
}
