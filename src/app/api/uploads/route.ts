import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getStorageAdapter } from "@/lib/storage/registry";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "@/lib/storage/types";

const ALLOWED_FOLDERS = ["vendor-logos", "vendor-covers", "vendor-documents", "products", "menu-items", "ads", "avatars", "hero"];

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  const folder = String(formData.get("folder") ?? "");

  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_FOLDERS.includes(folder)) return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_TYPES)[number])) {
    return NextResponse.json({ error: "Unsupported file type. Use JPEG, PNG, WebP, or PDF." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File is too large (max 8MB)." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const adapter = getStorageAdapter();
  const result = await adapter.upload({ buffer, filename: file.name, contentType: file.type }, `${folder}/${user.id}`);

  return NextResponse.json({ url: result.url, key: result.key });
}
