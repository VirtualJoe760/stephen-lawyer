import type { Metadata } from "next";
import { getFaqs } from "@/lib/sanity/queries";
import { Accordion } from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Sizing, shipping, returns, custom orders — frequently asked questions.",
};

export default async function FAQ() {
  const faqs = await getFaqs();
  return (
    <div className="px-4 md:px-8 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="wordmark text-6xl md:text-9xl mb-12">FAQ</h1>
        <Accordion items={faqs.map((f) => ({ id: f.id, title: f.question, body: <p>{f.answer}</p> }))} />
      </div>
    </div>
  );
}
