"use server";

import { headers } from "next/headers";
import { sendContactMessage } from "@/lib/contact/mailer";
import { RateLimiter } from "@/lib/contact/rate-limit";
import { spamReason, validateContact, type FieldErrors } from "@/lib/contact/validate";

export type ContactState = {
  status: "idle" | "success" | "error";
  message: string;
  errors?: FieldErrors;
  /** Echo valid input back so a failed send doesn't wipe what the reader typed. */
  values?: { name: string; email: string; topic: string; message: string };
};

// Per-visitor: 5 messages per 15 minutes (CONTACT_RATE_LIMIT overrides; the e2e run raises it
// because every test shares one IP). Site-wide: 60 per hour, as a backstop against floods.
const perVisitorLimit = Number(process.env.CONTACT_RATE_LIMIT) > 0 ? Number(process.env.CONTACT_RATE_LIMIT) : 5;
const perVisitor = new RateLimiter(perVisitorLimit, 15 * 60_000);
const siteWide = new RateLimiter(60, 60 * 60_000);

async function visitorKey() {
  const h = await headers();
  // Behind Vercel/most proxies the first x-forwarded-for entry is the client. Used only in memory.
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function submitContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  // Next.js already rejects Server Action posts whose Origin doesn't match the Host (CSRF protection).
  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v : "";
  };
  const values = { name: get("name"), email: get("email"), topic: get("topic"), message: get("message") };

  if (!perVisitor.hit(await visitorKey()) || !siteWide.hit("all")) {
    return {
      status: "error",
      message: "That's a lot of messages in a short time. Please wait a few minutes and try again.",
      values,
    };
  }

  const startedAt = Number(get("startedAt"));
  const elapsedMs = Number.isFinite(startedAt) && startedAt > 0 ? Date.now() - startedAt : null;
  if (spamReason({ honeypot: get("website"), elapsedMs, message: values.message })) {
    // Look successful so bots learn nothing; nothing is sent.
    return { status: "success", message: "Thanks! Your message is on its way." };
  }

  const result = validateContact(values);
  if (!result.ok) {
    return { status: "error", message: "Please fix the highlighted fields.", errors: result.errors, values };
  }

  const sent = await sendContactMessage(result.data);
  if (!sent.ok) {
    return {
      status: "error",
      message:
        sent.reason === "not-configured"
          ? "Sorry, the contact form isn't set up yet, so your message wasn't sent."
          : "Sorry, something went wrong sending your message. Please try again in a few minutes.",
      values,
    };
  }
  return { status: "success", message: "Thanks! Your message is on its way." };
}
