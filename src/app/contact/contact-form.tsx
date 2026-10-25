"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitContact, type ContactState } from "./actions";
import { TOPICS } from "@/lib/contact/topics";

const initial: ContactState = { status: "idle", message: "" };

const field =
  "mt-1 block w-full rounded-md border border-rule bg-paper-raised px-3 py-2.5 text-lg text-ink placeholder:text-ink-soft/70 focus:border-pond aria-[invalid=true]:border-[#9b3b2f] dark:aria-[invalid=true]:border-[#e59a8c]";
const errorText = "mt-1 text-base text-[#9b3b2f] dark:text-[#f0b2a6]";

export function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, initial);
  const startedAt = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Time the form became usable; quick-fire bot submissions are filtered on the server.
    if (startedAt.current && !startedAt.current.value) startedAt.current.value = String(Date.now());
  }, []);

  useEffect(() => {
    if (state.status !== "idle") statusRef.current?.focus();
  }, [state]);

  if (state.status === "success") {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="rounded-lg border border-moss bg-paper-raised p-6">
        <p className="text-xl">{state.message}</p>
        <p className="meta mt-2">If you left an email address, you&apos;ll hear back when there&apos;s an answer.</p>
      </div>
    );
  }

  const v = state.values;
  const e = state.errors ?? {};
  const invalid = (k: keyof typeof e) => (e[k] ? true : undefined);
  const describe = (k: keyof typeof e, hint?: string) =>
    [e[k] ? `${k}-error` : null, hint].filter(Boolean).join(" ") || undefined;

  return (
    <form action={action} noValidate className="max-w-xl space-y-6">
      {state.status === "error" && (
        <div ref={statusRef} tabIndex={-1} role="alert" className="rounded-lg border border-[#9b3b2f] bg-paper-raised p-4 dark:border-[#e59a8c]">
          {state.message}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block">
          Your name <span className="text-ink-soft">(optional)</span>
        </label>
        <input id="name" name="name" autoComplete="name" maxLength={100} defaultValue={v?.name} aria-invalid={invalid("name")} aria-describedby={describe("name")} className={field} />
        {e.name && <p id="name-error" className={errorText}>{e.name}</p>}
      </div>

      <div>
        <label htmlFor="email" className="block">Your email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={200}
          defaultValue={v?.email}
          aria-invalid={invalid("email")}
          aria-describedby={describe("email", "email-hint")}
          className={field}
        />
        <p id="email-hint" className="meta mt-1">Only used to reply to you.</p>
        {e.email && <p id="email-error" className={errorText}>{e.email}</p>}
      </div>

      <div>
        <label htmlFor="topic" className="block">What&apos;s it about?</label>
        <select id="topic" name="topic" defaultValue={v?.topic || "suggest"} aria-invalid={invalid("topic")} aria-describedby={describe("topic")} className={field}>
          {Object.entries(TOPICS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {e.topic && <p id="topic-error" className={errorText}>{e.topic}</p>}
      </div>

      <div>
        <label htmlFor="message" className="block">Message</label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          maxLength={4000}
          defaultValue={v?.message}
          aria-invalid={invalid("message")}
          aria-describedby={describe("message", "message-hint")}
          className={field}
        />
        <p id="message-hint" className="meta mt-1">
          Suggesting a bench? Roughly where is it, and what&apos;s the view like?
        </p>
        {e.message && <p id="message-error" className={errorText}>{e.message}</p>}
      </div>

      {/* Spam traps: hidden from people and assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Leave this empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <input ref={startedAt} type="hidden" name="startedAt" />

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 cursor-pointer items-center rounded-full bg-pond px-6 text-lg text-paper hover:bg-pond-deep disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
