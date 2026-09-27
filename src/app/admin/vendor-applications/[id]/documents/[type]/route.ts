import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage/registry";

const DOC_FIELDS = {
  "trade-license": "tradeLicenseDocKey",
  "national-id": "nationalIdDocKey",
} as const;

type DocType = keyof typeof DOC_FIELDS;

function isDocType(value: string): value is DocType {
  return value in DOC_FIELDS;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; type: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, type } = await params;
  if (!isDocType(type)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const field = DOC_FIELDS[type];
  const application = await db.vendorApplication.findUnique({ where: { id }, select: { [field]: true } });
  const key = application?.[field];
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const adapter = getStorageAdapter();
  const object = await adapter.getObject(key, { private: true });
  if (!object) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(object.body), {
    headers: {
      "Content-Type": object.contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "sandbox",
      "Content-Disposition": "inline",
    },
  });
}
