import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getStorageAdapter } from "@/lib/storage/registry";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "@/lib/storage/types";
import { matchesDeclaredType } from "@/lib/storage/magic-bytes";
import { adUploadRateLimiter } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/request";

const ALLOWED_FOLDERS = ["vendor-logos", "vendor-covers", "vendor-documents", "products", "menu-items", "ad-pending", "hero"];
// Ad images land in the private bucket under ad-pending/ — never publicly
// reachable until an admin approves the request, at which point they're
// copied into the public "ads" folder (see approveAdvertisementAction) and
// the private copy is deleted.
const PRIVATE_FOLDERS = ["vendor-documents", "ad-pending"];
// /advertise doesn't require login (lower friction for a business inquiry),
// so its image upload can't require it either — every other folder still
// does. Rate-limited separately below since there's no account to gate it.
const ANONYMOUS_ALLOWED_FOLDERS = ["ad-pending"];

// Per-folder overrides on top of the general defaults above. Ad banners get
// a tighter size cap, image-only types, and always-on magic-byte sniffing
// (not just for private folders) — advertiser-supplied content is the
// highest-risk upload path since it's shown to every site visitor.
const FOLDER_RULES: Record<string, { maxBytes?: number; allowedTypes?: readonly string[]; alwaysCheckMagicBytes?: boolean }> = {
  "ad-pending": { maxBytes: 5 * 1024 * 1024, allowedTypes: ["image/jpeg", "image/png", "image/webp"], alwaysCheckMagicBytes: true },
  "menu-items": { maxBytes: 5 * 1024 * 1024, allowedTypes: ["image/jpeg", "image/png", "image/webp"] },
};

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  const formData = await req.formData();
  const folder = String(formData.get("folder") ?? "");

  if (!user) {
    if (!ANONYMOUS_ALLOWED_FOLDERS.includes(folder)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ip = await getClientIp();
    if (!(await adUploadRateLimiter.consume(ip))) return NextResponse.json({ error: "Too many uploads. Please try again later." }, { status: 429 });
  }

  const file = formData.get("file");

  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_FOLDERS.includes(folder)) return NextResponse.json({ error: "Invalid folder" }, { status: 400 });

  const rules = FOLDER_RULES[folder];
  const allowedTypes = rules?.allowedTypes ?? ALLOWED_UPLOAD_TYPES;
  const maxBytes = rules?.maxBytes ?? MAX_UPLOAD_BYTES;

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: `Unsupported file type. Use ${allowedTypes.map((t) => t.split("/")[1]).join(", ").toUpperCase()}.` }, { status: 400 });
  }
  if (file.size > maxBytes) {
    return NextResponse.json({ error: `File is too large (max ${Math.round(maxBytes / (1024 * 1024))}MB).` }, { status: 400 });
  }

  const isPrivate = PRIVATE_FOLDERS.includes(folder);
  const buffer = Buffer.from(await file.arrayBuffer());

  if ((isPrivate || rules?.alwaysCheckMagicBytes) && !matchesDeclaredType(buffer, file.type)) {
    return NextResponse.json({ error: "File content doesn't match its declared type." }, { status: 400 });
  }

  const adapter = getStorageAdapter();
  const ownerSegment = user?.id ?? `anon-${crypto.randomUUID()}`;
  const result = await adapter.upload({ buffer, filename: file.name, contentType: file.type }, `${folder}/${ownerSegment}`, { private: isPrivate });

  // Private uploads never get a usable `url` — only the caller's own record
  // of the key can ever be used to fetch the file back, through the
  // authenticated document route.
  return NextResponse.json(isPrivate ? { key: result.key } : { url: result.url, key: result.key });
}
