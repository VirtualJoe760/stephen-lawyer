import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the STEPHEN LAWYER team.",
};

export default function Contact() {
  return (
    <div className="px-4 md:px-8 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="wordmark text-6xl md:text-9xl mb-6">Contact</h1>
        <p className="text-lg mb-10 leading-relaxed max-w-prose">
          Order question? Read the <Link href="/faq" className="underline hover:text-hazard">FAQ</Link> first — most things are covered there. Otherwise drop us a line.
        </p>
        <ContactForm />
      </div>
    </div>
  );
}
