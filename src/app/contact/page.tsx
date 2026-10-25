import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Say hello",
  description: "Suggest a bench, tell us something has changed, or just say hi.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="frame pt-12 sm:pt-16">
      <h1 className="display text-5xl sm:text-6xl">Say hello</h1>
      <p className="lede mt-5">
        Know a bench that should be here? Noticed one has moved, or lost its shade? Send a note. Every message
        gets read.
      </p>
      <div className="mt-10">
        <ContactForm />
      </div>
      <p className="meta mt-8 max-w-xl">
        Your message is emailed straight to the person who runs this site and isn&apos;t stored here. Read the{" "}
        <Link href="/privacy">privacy policy</Link> for the details.
      </p>
    </div>
  );
}
