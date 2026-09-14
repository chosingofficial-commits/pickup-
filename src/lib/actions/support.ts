"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { supportTicketSchema } from "@/lib/validation/support";
import { supportTicketRateLimiter } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/request";
import type { ActionState } from "./types";

export async function submitSupportTicketAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await getClientIp();
  const allowed = await supportTicketRateLimiter.consume(ip);
  if (!allowed) return { status: "error", message: "Too many requests. Please try again later." };

  const parsed = supportTicketSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    subject: formData.get("subject"),
    category: formData.get("category"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed.error.flatten().fieldErrors)) if (value) fieldErrors[key] = value;
    return { status: "error", message: "Please fix the errors below.", fieldErrors };
  }

  const user = await getCurrentUser();

  const ticket = await db.supportTicket.create({
    data: {
      requesterId: user?.id,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      subject: parsed.data.subject,
      category: parsed.data.category,
      messages: { create: { authorId: user?.id, message: parsed.data.message } },
    },
  });

  revalidatePath("/account/support");
  return { status: "success", message: `Support request #${ticket.id.slice(-6).toUpperCase()} submitted. We'll get back to you soon.` };
}
