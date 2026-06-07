import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms" };

export default function Terms() {
  return (
    <div className="px-4 md:px-8 py-16">
      <article className="max-w-3xl mx-auto">
        <h1 className="wordmark text-6xl md:text-8xl mb-10">Terms</h1>
        <div className="space-y-4 text-base leading-relaxed">
          <p>By using this site, you agree to these terms. Don't misuse it. Don't scrape it. Don't try to exploit checkout. Be cool.</p>
          <h2 className="wordmark text-3xl mt-8">Products</h2>
          <p>All products are made-to-order. Colors may vary slightly from on-screen renderings depending on print run and your display. Sizes and stock are subject to change.</p>
          <h2 className="wordmark text-3xl mt-8">Pricing &amp; payment</h2>
          <p>Prices are in USD. Stripe processes payment. Sales tax is collected where applicable (Stripe Tax). Currency conversion is handled by your card issuer.</p>
          <h2 className="wordmark text-3xl mt-8">Intellectual property</h2>
          <p>All marks, designs, and content on this site are the property of STEPHEN LAWYER and its collaborators. Don't reproduce, resell, or pretend it's yours.</p>
          <h2 className="wordmark text-3xl mt-8">Liability</h2>
          <p>We're a small operation. We do our best to ship what we promise. If something goes wrong, we'll fix it — but we're not liable for indirect, consequential, or incidental damages.</p>
          <h2 className="wordmark text-3xl mt-8">Governing law</h2>
          <p>These terms are governed by the laws of California, USA.</p>
        </div>
      </article>
    </div>
  );
}
