"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import type { ActionState } from "./types";

const schema = z.object({ email: z.string().trim().email("Enter a valid email address") });

export async function subscribeNewsletterAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Enter a valid email address." };
  }

  await db.newsletterSubscriber.upsert({
    where: { email: parsed.data.email },
    create: { email: parsed.data.email },
    update: {},
  });

  return { status: "success", message: "Subscribed! You'll hear from us when Pick Up expands or runs new offers." };
}
