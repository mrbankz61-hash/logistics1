"use server";

import { parseInput } from "@/lib/errors";
import { runAction } from "@/lib/server/action";
import { saveContactMessage } from "@/lib/server/messages";
import { contactSchema } from "@/lib/validation";

export async function sendContactMessage(input: unknown) {
  return runAction(async () => {
    const data = parseInput(contactSchema, input);
    // Honeypot filled in: pretend it worked, store nothing.
    if (data.company) return;
    await saveContactMessage(data);
  });
}
