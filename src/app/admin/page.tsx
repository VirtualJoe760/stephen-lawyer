// Phase 1 placeholder. Phase 2 replaces this with a redirect to /admin/designer.
export default function AdminHome() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-widest text-hazard">Admin</p>
      <h1 className="mt-2 font-display text-5xl uppercase leading-none">Design Generator</h1>
      <p className="mt-4 text-bone/70">
        Foundation is in place. The canvas designer ships in the next phase.
      </p>
      <ul className="mt-6 space-y-1 text-sm text-bone/60">
        <li>✓ Schema + migration (catalogues, designs, compositions, canvas nodes)</li>
        <li>✓ Admin auth gate (ADMIN_EMAILS allowlist)</li>
        <li>✓ Gemini · Cloudinary · Printful wiring</li>
        <li>→ Next: /admin/designer canvas</li>
      </ul>
    </div>
  );
}
