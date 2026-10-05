"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/rbac";
import { recordAuditLog } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { optionalText } from "@/lib/validation/form-helpers";
import type { ActionState } from "./types";

const categorySchema = z.object({
  name: z.string().trim().min(2, "Enter a category name").max(80),
  parentId: optionalText(z.string()),
  isAgeRestricted: z.coerce.boolean().default(false),
});

export async function createCategoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    parentId: formData.get("parentId"),
    isAgeRestricted: formData.get("isAgeRestricted") === "1",
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input." };

  const slug = slugify(parsed.data.name);
  const existing = await db.category.findUnique({ where: { slug } });
  if (existing) return { status: "error", message: "A category with this name already exists." };

  await db.category.create({
    data: {
      name: parsed.data.name,
      slug,
      parentId: parsed.data.parentId || null,
      isAgeRestricted: parsed.data.isAgeRestricted,
      isActive: !parsed.data.isAgeRestricted, // age-restricted categories start disabled until compliance review
    },
  });

  await recordAuditLog({ actorUserId: admin.id, action: "CATEGORY_CREATED", entityType: "Category", metadata: { name: parsed.data.name } });
  revalidatePath("/admin/categories");
  revalidateTag("categories", "minutes");
  return { status: "success", message: "Category created." };
}

export async function toggleCategoryActiveAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const categoryId = String(formData.get("categoryId") ?? "");
  const category = await db.category.findUnique({ where: { id: categoryId } });
  if (!category) return;

  await db.category.update({ where: { id: categoryId }, data: { isActive: !category.isActive } });
  await recordAuditLog({ actorUserId: admin.id, action: category.isActive ? "CATEGORY_DISABLED" : "CATEGORY_ENABLED", entityType: "Category", entityId: categoryId });
  revalidatePath("/admin/categories");
  revalidateTag("categories", "minutes");
}
