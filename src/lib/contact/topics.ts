// Kept separate from validate.ts so the browser bundle doesn't pull in zod.
export const TOPICS = {
  suggest: "Suggest a bench",
  update: "Something has changed",
  other: "Something else",
} as const;

export type Topic = keyof typeof TOPICS;
