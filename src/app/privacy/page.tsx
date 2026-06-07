import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <div className="px-4 md:px-8 py-16">
      <article className="max-w-3xl mx-auto">
        <h1 className="wordmark text-6xl md:text-8xl mb-10">Privacy</h1>
        <div className="space-y-4 text-base leading-relaxed">
          <p>This privacy policy describes how STEPHEN LAWYER collects and uses information when you visit or buy from this site.</p>
          <h2 className="wordmark text-3xl mt-8">What we collect</h2>
          <p>Order information (name, email, shipping address, items purchased) and basic technical data (browser, device, IP) for site reliability and fraud prevention. We don't run third-party trackers. Analytics is privacy-friendly (Plausible / Vercel Analytics), aggregated, and anonymous.</p>
          <h2 className="wordmark text-3xl mt-8">How we use it</h2>
          <p>To fulfill orders (via Printful), to process payments (via Stripe), to send transactional email (via Resend), and to improve the site. We don't sell your data.</p>
          <h2 className="wordmark text-3xl mt-8">Cookies</h2>
          <p>Strictly necessary cookies for authentication and cart persistence. No advertising cookies.</p>
          <h2 className="wordmark text-3xl mt-8">Your rights</h2>
          <p>Email <a href="mailto:privacy@stephenlawyer.clothing" className="underline hover:text-hazard">privacy@stephenlawyer.clothing</a> to request access, correction, or deletion of your data.</p>
        </div>
      </article>
    </div>
  );
}
