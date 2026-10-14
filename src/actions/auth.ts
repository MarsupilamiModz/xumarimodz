"use server";

import { sendWelcomeEmail } from "@/lib/email/send";
import { runAfterResponse } from "@/lib/after-response";

export async function sendRegistrationWelcomeEmail(email: string, username?: string) {
  const name = username?.trim() || email.split("@")[0] || "there";
  runAfterResponse(sendWelcomeEmail({ email, username: name }));
}
