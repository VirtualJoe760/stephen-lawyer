"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="px-4 md:px-8 py-32 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-2">// error</p>
      <h1 className="wordmark text-6xl md:text-8xl mb-4">Something broke.</h1>
      <p className="text-base mb-8 max-w-md mx-auto">
        We logged it. Try again in a sec, or head back home.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={reset}
          className="h-12 px-6 inline-flex items-center justify-center bg-ink text-bone font-mono text-xs uppercase tracking-widest hover:bg-hazard hover:text-ink"
        >
          Try again
        </button>
        <Link
          href="/"
          className="h-12 px-6 inline-flex items-center justify-center border-2 border-ink font-mono text-xs uppercase tracking-widest hover:bg-ink hover:text-bone"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
