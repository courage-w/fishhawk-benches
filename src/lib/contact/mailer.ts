import "server-only";
import { TOPICS } from "./topics";
import type { ContactInput } from "./validate";

// Secrets come from the environment only and never reach the browser (no NEXT_PUBLIC_ prefix).
//   RESEND_API_KEY     Resend API key
//   CONTACT_TO_EMAIL   where messages are delivered (your inbox)
//   CONTACT_FROM_EMAIL a sender on a domain verified in Resend
//   CONTACT_DELIVERY   "resend" (default) or "log" for local testing; "log" is refused in production
//                      unless ALLOW_LOG_DELIVERY=true (used only by the automated test run)

export type SendResult = { ok: true } | { ok: false; reason: "not-configured" | "failed" };

export async function sendContactMessage(input: ContactInput): Promise<SendResult> {
  const mode = process.env.CONTACT_DELIVERY ?? "resend";
  const subject = `[FishHawk Benches] ${TOPICS[input.topic]}${input.name ? ` from ${input.name}` : ""}`.slice(0, 150);
  const text = [
    `Topic: ${TOPICS[input.topic]}`,
    `Name: ${input.name || "(not given)"}`,
    `Reply to: ${input.email}`,
    "",
    input.message,
  ].join("\n");

  if (mode === "log") {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_LOG_DELIVERY !== "true") {
      console.error("contact: CONTACT_DELIVERY=log is not allowed in production");
      return { ok: false, reason: "not-configured" };
    }
    // Log only the shape, not the reader's personal details.
    console.info(`contact (log mode): "${subject}", ${input.message.length} characters`);
    return { ok: true };
  }

  // Values pasted or piped into a host's settings can carry a byte-order mark or stray whitespace,
  // which breaks the Authorization header ("Cannot convert argument to a ByteString").
  const env = (name: string) => process.env[name]?.replace(/﻿/g, "").trim() || undefined;
  const apiKey = env("RESEND_API_KEY");
  const to = env("CONTACT_TO_EMAIL");
  const from = env("CONTACT_FROM_EMAIL");
  if (!apiKey || !to || !from) {
    console.error("contact: RESEND_API_KEY, CONTACT_TO_EMAIL and CONTACT_FROM_EMAIL must all be set");
    return { ok: false, reason: "not-configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text, reply_to: input.email }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      // Resend's error `name` (e.g. validation_error) says what's wrong without logging addresses.
      const detail = (await response.json().catch(() => null)) as { name?: unknown } | null;
      const name = typeof detail?.name === "string" ? detail.name.replace(/[^\w-]/g, "").slice(0, 60) : "unknown";
      console.error(`contact: Resend responded ${response.status} (${name})`);
      return { ok: false, reason: "failed" };
    }
    // Resend's message id lets you find this email in the Resend dashboard (Emails) to check delivery.
    const sent = (await response.json().catch(() => null)) as { id?: unknown } | null;
    const id = typeof sent?.id === "string" ? sent.id.replace(/[^\w-]/g, "").slice(0, 64) : "unknown";
    console.info(`contact: accepted by Resend (id ${id})`);
    return { ok: true };
  } catch (error) {
    // Error text can echo the API key (bad header) or an address, so both are blanked out.
    const scrub = (s: unknown) =>
      String(s ?? "").replace(/re_\w+/g, "re_***").replace(/[^\s"'<>]+@[^\s"'<>]+/g, "***@***").slice(0, 200);
    const err = error as Error & { cause?: { name?: unknown; code?: unknown; message?: unknown } };
    const cause = err.cause ? ` / cause ${scrub(err.cause.name)} ${scrub(err.cause.code)}: ${scrub(err.cause.message)}` : "";
    console.error(`contact: send failed (${err.name}: ${scrub(err.message)}${cause})`);
    return { ok: false, reason: "failed" };
  }
}
