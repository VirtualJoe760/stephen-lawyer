import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-4 md:px-8 py-32 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-2">// 404</p>
      <h1 className="wordmark text-7xl md:text-9xl mb-6">Nothing here.</h1>
      <p className="text-lg mb-8">Wrong spot, or the page got pulled.</p>
      <Link href="/" className="font-mono text-xs uppercase tracking-widest underline hover:text-hazard">
        Back to home →
      </Link>
    </div>
  );
}
