import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping & returns",
};

export default function ShippingReturns() {
  return (
    <div className="px-4 md:px-8 py-16">
      <article className="max-w-3xl mx-auto prose-stephen">
        <h1 className="wordmark text-6xl md:text-8xl mb-10">Shipping &amp; returns</h1>

        <h2 className="wordmark text-3xl mt-10 mb-3">Production</h2>
        <p className="text-base leading-relaxed">
          Every item is made-to-order by Printful. Production usually takes 2–5 business days after your order is placed. Drop releases can take longer if a queue forms — we'll email if anything is delayed.
        </p>

        <h2 className="wordmark text-3xl mt-10 mb-3">Domestic shipping</h2>
        <p className="text-base leading-relaxed">
          US orders typically ship in 3–7 business days after production. Free shipping on US orders over $80.
        </p>

        <h2 className="wordmark text-3xl mt-10 mb-3">International shipping</h2>
        <p className="text-base leading-relaxed">
          We ship worldwide. Delivery is 7–20 business days depending on destination. Customs, VAT, and import duties are not included and may be charged on arrival.
        </p>

        <h2 className="wordmark text-3xl mt-10 mb-3">Returns</h2>
        <p className="text-base leading-relaxed">
          Because everything is made-to-order, we can't accept general returns or size exchanges. If your item arrives damaged or misprinted, email <a href="mailto:hello@stephenlawyer.clothing" className="underline hover:text-hazard">hello@stephenlawyer.clothing</a> within 14 days with photos and we'll make it right.
        </p>

        <h2 className="wordmark text-3xl mt-10 mb-3">Lost packages</h2>
        <p className="text-base leading-relaxed">
          If tracking says delivered but you didn't receive it, give it 48 hours, check with neighbors and the post office, then reach out. We'll work with the carrier and reship if needed.
        </p>
      </article>
    </div>
  );
}
