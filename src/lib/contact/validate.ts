// Validation and spam heuristics for the contact form. Pure functions, unit-tested.
import { z } from "zod";
import { TOPICS, type Topic } from "./topics";

export { TOPICS };

/** Strip control characters (incl. CR/LF, which could split email headers) from single-line fields. */
const singleLine = (s: string) => s.replace(/[\u0000-\u001f\u007f]+/g, " ").trim();

export const contactSchema = z.object({
  name: z.string().max(100, "Please keep your name under 100 characters.").transform(singleLine),
  email: z
    .string()
    .transform(singleLine)
    .pipe(z.email("Please enter an email address like you@example.com.").max(200)),
  topic: z.enum(Object.keys(TOPICS) as [Topic, ...Topic[]], "Please pick a topic."),
  message: z
    .string()
    .trim()
    .min(10, "Please write a little more (at least 10 characters).")
    .max(4000, "Please keep your message under 4,000 characters."),
});

export type ContactInput = z.infer<typeof contactSchema>;

export type FieldErrors = Partial<Record<keyof ContactInput, string>>;

export function validateContact(form: Record<string, unknown>):
  | { ok: true; data: ContactInput }
  | { ok: false; errors: FieldErrors } {
  const result = contactSchema.safeParse({
    name: typeof form.name === "string" ? form.name : "",
    email: typeof form.email === "string" ? form.email : "",
    topic: form.topic,
    message: typeof form.message === "string" ? form.message : "",
  });
  if (result.success) return { ok: true, data: result.data };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof ContactInput;
    errors[key] ??= issue.message;
  }
  return { ok: false, errors };
}

/**
 * Cheap bot signals. Returns a reason when the submission looks automated.
 * - honeypot: a visually hidden field people never fill in
 * - elapsedMs: time since the form appeared (set by the browser); bots post instantly
 * - links: messages stuffed with URLs
 */
export function spamReason(input: { honeypot: string; elapsedMs: number | null; message: string }): string | null {
  if (input.honeypot.trim() !== "") return "honeypot";
  if (input.elapsedMs !== null && input.elapsedMs < 3000) return "too-fast";
  if ((input.message.match(/https?:\/\//gi) ?? []).length > 3) return "too-many-links";
  return null;
}
