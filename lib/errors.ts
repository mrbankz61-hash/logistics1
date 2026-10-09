import type { z } from "zod";

/** An error whose message is safe and useful to show to the user. */
export class UserError extends Error {
  constructor(
    message: string,
    public fieldErrors?: Record<string, string[]>,
    /** Machine-readable reason, e.g. "conflict" when the record changed underneath the user. */
    public code?: "conflict" | "not_found",
  ) {
    super(message);
    this.name = "UserError";
  }
}

/** Field errors keyed by dotted path, e.g. { "receiver.phone": ["Required"] }. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new UserError("Please check the highlighted fields.", fieldErrorsFrom(result.error));
  }
  return result.data;
}
